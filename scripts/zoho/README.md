# Zoho Sprints ticket-status sync

`.github/workflows/zoho-ticket-status-sync.yml` runs
`sync-ticket-status.mjs` on branch pushes and PR events to move a ticket
forward through: To do -> In Progress -> Done. It never moves a ticket
backward (see `STATUS_RANK`).

This project's Kanban board only has three statuses, and this repo's branch
model is `master` (dev/integration) -> `main` (production), with no staging
branch. That's simpler than the sibling Mwafq portal repo's board (which has
five statuses including Code Review / Staging Done), so this sync only maps
two events:

| Event | Target status |
|---|---|
| Push to any branch matching `MB-I<n>-...` (not `main`/`master`) | In Progress |
| PR merged into `master` or `main` | Done |

A PR being opened does not move the status — there's no "Code Review" column
to move it to on this board.

The ticket number is parsed from the branch name (`MB-I<n>`) — same
convention the `ship`/`ship-prod`/`pickup-ticket` skills use. If no ticket
number is found in the branch name, the run exits cleanly (not a failure) —
most branches won't have one.

## ⚠️ Before relying on this

This script is adapted from the sibling Mwafq portal repo's
`scripts/zoho/sync-ticket-status.mjs`, where the base domain/path and the
read path (`findItemByNumber`, `action=sprintitems`) were confirmed against
a real working Zoho Sprints client
([tap-zohosprints](https://github.com/AutoIDM/tap-zohosprints)), and
`updateStatus` (`POST` to the itemId path, `statusid` query param, no
`action`) was confirmed correct in shape against a real ticket in that
project. Those confirmations don't automatically carry over to this
project's board/IDs — the workflow ships with `DRY_RUN: "true"` by default.
Before flipping it to `"false"`:

1. Run with `DRY_RUN: "true"` against a real PR/branch and read the Action
   logs — confirm `findItemByNumber` resolves the right ticket and the right
   target status.
2. Test `updateStatus` for real against a disposable ticket you own before
   trusting it for everyone's tickets.

### ⚠️ Known limitation: item ownership

Zoho Sprints restricts item field updates (`statusid` included) to **the
item's owner** — confirmed in the sibling Mwafq portal project: the same
call that succeeded against a ticket the tester owned failed with
`7401.14 Doesn't have permission in item` against a ticket owned by someone
else, even though the caller (a Sprints project admin) could edit that same
ticket fine through the web UI. This isn't a scope or credentials problem —
even the interactive MCP tool, authenticated as a real admin account, hits
the identical `7401.14` on tickets it doesn't own.

Practical effect: this workflow's self-client acts as **one fixed Zoho
identity**. Status updates only succeed for tickets owned by whichever
account that is — for everyone else's tickets, `main()` catches the
`7401.14` and exits cleanly with a log line (not a failed Action run):
```
[zoho-sync] Skipping: I<n> isn't owned by this integration's account
(Zoho 7401.14) - can't update status via API. Move it manually.
```
So in practice this automates status-forwarding only for tickets owned by
the self-client's account; other tickets still need a manual status update.

## One-time setup: Zoho self-client credentials

The MCP server you use interactively authenticates as you personally;
GitHub Actions has no interactive login, so it needs its own long-lived
credential. If a self-client was already created for the sibling Mwafq
portal repo, it can likely be reused (same Zoho org/data center) — otherwise:

1. Go to the Zoho API Console for this org's data center
   (`https://api-console.zoho.sa` for a `.sa` account) and create a
   **Self Client**.
2. Generate an authorization code with the Sprints API scope (check the
   exact scope name in the console's scope picker/Sprints API docs) and a
   data center matching this project (`.sa`).
3. Exchange that authorization code once, by hand, for a `refresh_token`
   (see the self-client flow in Zoho's OAuth docs) — self-client refresh
   tokens don't expire the way a normal 1-hour access token does, so this
   is a one-time step.
4. Add three **repo secrets** (Settings → Secrets and variables → Actions)
   on this repo:
   - `ZOHO_CLIENT_ID`
   - `ZOHO_CLIENT_SECRET`
   - `ZOHO_REFRESH_TOKEN`

## IDs hardcoded for this project

Same ones the `ship`/`pickup-ticket` skills document (see
`.claude/skills/ship/SKILL.md` and `.claude/skills/pickup-ticket/SKILL.md`):
teamId `150001150029`, projectId `1335000000017077` (Mwafq - B2C), Kanban
board `1335000000017080`, backlog `1335000000017079`. Status IDs are in
`STATUS_RANK` in the script. If the board is ever reconfigured and these
change, re-derive them the same way — sample a ticket in the relevant column
via the Sprints API/MCP `GetItemDetails`.
