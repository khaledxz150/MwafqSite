#!/usr/bin/env node
// Moves a Zoho Sprints ticket forward through its status lifecycle based on
// GitHub branch/PR activity. Never moves a ticket backward - see STATUS_RANK.
//
// Required env:
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
//     - from a Zoho self-client (see .github/workflows/zoho-ticket-status-sync.yml)
//   GITHUB_EVENT_NAME, GITHUB_HEAD_REF or GITHUB_REF_NAME, GITHUB_BASE_REF, PR_MERGED
//     - wired from the workflow's github context, not set by hand
//
// Optional env overrides (defaults match this project - Mwafq B2C):
//   ZOHO_ACCOUNTS_DOMAIN (default https://accounts.zoho.sa)
//   ZOHO_API_DOMAIN       (default https://sprintsapi.zoho.sa/zsapi)
//   ZOHO_TEAM_ID          (default 150001150029)
//   ZOHO_PROJECT_ID       (default 1335000000017077)
//   ZOHO_KANBAN_SPRINT_ID (default 1335000000017080)
//   ZOHO_BACKLOG_SPRINT_ID(default 1335000000017079)
//
// Ticket key convention for this repo is MB-I<n> (see the ship/pickup-ticket
// skills) - branch names look like MB-I21-Academy-Course-Search.
//
// Unlike the sibling Mwafq portal repo, this project's Kanban board only has
// three statuses (To do / In progress / Done) - there is no separate "Code
// Review" or "Staging Done" column, and this repo has no staging branch
// (branch model is master = dev, main = production, per CLAUDE.md). So the
// mapping here is simpler: a PR being opened does not move the status past
// "In progress" since there's no matching column to move it to.
//
// The read path (findItemByNumber) uses the endpoint shape confirmed against
// a real open-source Zoho Sprints client (github.com/AutoIDM/tap-zohosprints):
// GET {API_DOMAIN}/team/{teamId}/projects/{projectId}/sprints/{sprintId}/item/?action=sprintitems
// The write paths (updateStatus, moveToKanban) are still a best-effort guess -
// verify them against real Zoho Sprints docs before flipping DRY_RUN off.

const env = process.env;

const ACCOUNTS_DOMAIN = env.ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.sa";
const API_DOMAIN = env.ZOHO_API_DOMAIN || "https://sprintsapi.zoho.sa/zsapi";
const TEAM_ID = env.ZOHO_TEAM_ID || "150001150029";
const PROJECT_ID = env.ZOHO_PROJECT_ID || "1335000000017077";
const KANBAN_SPRINT_ID = env.ZOHO_KANBAN_SPRINT_ID || "1335000000017080";
const BACKLOG_SPRINT_ID = env.ZOHO_BACKLOG_SPRINT_ID || "1335000000017079";

// Lower rank = earlier in the lifecycle. A sync never moves a ticket to a
// lower rank than its current status.
const STATUS_RANK = {
  "1335000000008495": { name: "To do", rank: 1 },
  "1335000000008497": { name: "In progress", rank: 2 },
  "1335000000008499": { name: "Done", rank: 3 },
};

const TARGET_STATUS_ID = {
  IN_PROGRESS: "1335000000008497",
  DONE: "1335000000008499",
};

function fail(message) {
  console.error(`[zoho-sync] ERROR: ${message}`);
  process.exit(1);
}

function skip(message) {
  console.log(`[zoho-sync] Skipping: ${message}`);
  process.exit(0);
}

function extractTicketNumber(branchName) {
  if (!branchName) return null;
  const match = branchName.match(/MB-I(\d+)/i);
  return match ? match[1] : null;
}

function resolveDesiredStatus() {
  const eventName = env.GITHUB_EVENT_NAME;
  const baseRef = env.GITHUB_BASE_REF || "";
  const merged = env.PR_MERGED === "true";

  if (eventName === "push") {
    return { statusId: TARGET_STATUS_ID.IN_PROGRESS, reason: "branch pushed" };
  }
  if (eventName === "pull_request") {
    const action = env.PR_ACTION;
    if (action === "closed" && merged) {
      if (baseRef === "master" || baseRef === "main") {
        return {
          statusId: TARGET_STATUS_ID.DONE,
          reason: `PR merged into ${baseRef}`,
        };
      }
    }
  }
  return null;
}

async function getAccessToken() {
  const url = new URL(`${ACCOUNTS_DOMAIN}/oauth/v2/token`);
  url.searchParams.set("refresh_token", env.ZOHO_REFRESH_TOKEN);
  url.searchParams.set("client_id", env.ZOHO_CLIENT_ID);
  url.searchParams.set("client_secret", env.ZOHO_CLIENT_SECRET);
  url.searchParams.set("grant_type", "refresh_token");

  const res = await fetch(url, { method: "POST" });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    fail(`Token refresh failed: ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

async function zohoFetch(accessToken, path, { method = "GET", query, body } = {}) {
  const url = new URL(`${API_DOMAIN}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "x-za-ui-version": "v2",
      "X-convert-response": "true",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || data.status === "failure") {
    const err = new Error(`Zoho API call failed (${path}): ${JSON.stringify(data)}`);
    err.zohoCode = data.code;
    throw err;
  }
  return data;
}

// Zoho Sprints restricts item field updates (e.g. statusid) to the item's
// owner - even a project admin's own account gets this on items they don't
// own. Treat it as an expected, non-fatal outcome: most tickets in this
// project won't be owned by whichever account backs this self-client.
const PERMISSION_DENIED_CODE = "7401.14";

async function findItemByNumber(accessToken, itemNo) {
  for (const sprintId of [KANBAN_SPRINT_ID, BACKLOG_SPRINT_ID]) {
    let index = 1;
    for (;;) {
      const data = await zohoFetch(
        accessToken,
        `/team/${TEAM_ID}/projects/${PROJECT_ID}/sprints/${sprintId}/item/`,
        {
          query: {
            action: "sprintitems",
            subitem: "true",
            index: String(index),
            range: "250",
          },
        },
      );
      if (env.DEBUG_ZOHO === "true") {
        console.log(
          `[zoho-sync][debug] sprint ${sprintId} index ${index}: ` +
            JSON.stringify(data).slice(0, 2000),
        );
      }
      // Confirmed shape: items/next are top-level, not nested under `data`.
      const items = data.items || [];
      const found = items.find((it) => String(it.itemNo) === String(itemNo));
      if (found) return { item: found, sprintId };
      if (!data.next) break;
      index += 250;
    }
  }
  return null;
}

// NOT independently verified against Zoho's docs - action names/method are a
// best-effort guess from the MCP tool's abstracted schema. Confirm against a
// disposable test ticket before trusting (see scripts/zoho/README.md).
async function moveToKanban(accessToken, itemId) {
  await zohoFetch(
    accessToken,
    `/team/${TEAM_ID}/projects/${PROJECT_ID}/sprints/${BACKLOG_SPRINT_ID}/item/`,
    {
      method: "POST",
      query: {
        action: "moveitem",
        itemidarr: JSON.stringify([itemId]),
        toprojectid: PROJECT_ID,
        tosprintid: KANBAN_SPRINT_ID,
      },
    },
  );
}

// NOT independently verified against Zoho's docs - same caveat as moveToKanban.
async function updateStatus(accessToken, itemId, statusId) {
  await zohoFetch(
    accessToken,
    `/team/${TEAM_ID}/projects/${PROJECT_ID}/sprints/${KANBAN_SPRINT_ID}/item/${itemId}/`,
    { method: "POST", query: { statusid: statusId } },
  );
}

async function main() {
  const branchName =
    env.GITHUB_HEAD_REF || (env.GITHUB_REF_NAME || "").replace(/^refs\/heads\//, "");
  const itemNo = extractTicketNumber(branchName);
  if (!itemNo) skip(`no MB-I<n> ticket number found in "${branchName}"`);

  const desired = resolveDesiredStatus();
  if (!desired) skip("event does not map to a status transition");

  const accessToken = await getAccessToken();
  const found = await findItemByNumber(accessToken, itemNo);
  if (!found) skip(`no ticket with itemNo ${itemNo} found in Kanban or Backlog`);

  const { item, sprintId } = found;
  const currentRank = STATUS_RANK[item.statusId]?.rank;
  const desiredRank = STATUS_RANK[desired.statusId].rank;

  if (currentRank === undefined) {
    fail(
      `Ticket I${itemNo} has unrecognized statusId ${item.statusId} - update STATUS_RANK`,
    );
  }
  if (currentRank >= desiredRank) {
    skip(
      `I${itemNo} is already "${STATUS_RANK[item.statusId].name}" (rank ${currentRank}), ` +
        `not moving to "${STATUS_RANK[desired.statusId].name}" (rank ${desiredRank})`,
    );
  }

  const transitionLog =
    `I${itemNo}: ${STATUS_RANK[item.statusId].name} -> ` +
    `${STATUS_RANK[desired.statusId].name} (${desired.reason})`;

  if (env.DRY_RUN === "true") {
    console.log(`[zoho-sync] DRY RUN - would apply: ${transitionLog}`);
    if (sprintId === BACKLOG_SPRINT_ID) {
      console.log(`[zoho-sync] DRY RUN - would move I${itemNo} from Backlog to Kanban first`);
    }
    return;
  }

  try {
    if (sprintId === BACKLOG_SPRINT_ID) {
      console.log(`[zoho-sync] Moving I${itemNo} from Backlog to Kanban board first`);
      await moveToKanban(accessToken, item.itemId);
    }

    await updateStatus(accessToken, item.itemId, desired.statusId);
    console.log(`[zoho-sync] ${transitionLog}`);
  } catch (err) {
    if (err.zohoCode === PERMISSION_DENIED_CODE) {
      console.log(
        `[zoho-sync] Skipping: I${itemNo} isn't owned by this integration's account ` +
          `(Zoho ${PERMISSION_DENIED_CODE}) - can't update status via API. Move it manually.`,
      );
      return;
    }
    throw err;
  }
}

main().catch((err) => fail(err.stack || String(err)));
