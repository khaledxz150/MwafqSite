---
name: pickup-ticket
description: "Given a Zoho Sprints ticket ID (e.g. I21 or MB-I21), fetch its title/description, do the repo's standard prework (checkout master, pull, branch off it), and start implementing what the ticket describes. Use when the user asks to 'pick up ticket X', 'start working on I21', 'work on ticket MB-I21', or similar — the counterpart to /create-ticket (files it) and /ship (ships it)."
trigger: /pickup-ticket
---

# /pickup-ticket

Take a Zoho Sprints ticket ID, read what it actually asks for, set up a
clean branch for it, and start implementing — the counterpart to
`/create-ticket` (writes the spec) and `/ship`/`/ship-prod` (land the
result). This skill covers the middle: turning a filed ticket into work in
progress.

## Branch model for this repo

- **`master` = dev/integration branch.** All feature branches are cut from
  `master` and PR'd back into it.
- **`main` = production.** Only reached via `/ship-prod`.

## Usage

```
/pickup-ticket I21          # ticket item number
/pickup-ticket MB-I21       # ticket key (same item, full key form)
/pickup-ticket 21           # bare number, same item
```

## Workflow

1. **Resolve the ticket.** Normalize whatever the user gave (`I21`,
   `MB-I21`, `21`) to the item number form Zoho Sprints uses (`I21`).
   Look it up with `ZohoSprints_GetItems`:
   ```
   teamId: 150001150029
   projectId: 1335000000017077   (Mwafq - B2C)
   sprintId: 1335000000017079    (this project's backlog)
   searchby: "name"
   searchvalue: "I21"
   ```
   If nothing matches there, also check the Kanban board sprint
   (`1335000000017080`) — items filed by `/ticket` are moved onto the board,
   so that's where most live. Then `ZohoSprints_GetItemDetails` for the full
   `itemName` and `description`. If nothing matches in either, stop and say
   so rather than guessing a different ticket or fabricating scope — don't
   proceed to branch/implement without a real ticket to anchor the work.

2. **Read and restate the ticket before touching git.** Parse out the
   Summary, Requirements, and Acceptance Criteria sections (tickets filed by
   `/create-ticket` follow that template; older items may be freeform —
   restate them yourself in that shape). Turn the Acceptance Criteria
   checklist into a `TodoWrite` list — this is what you'll work through. If
   the description is too thin to act on (no clear requirements), ask the
   user to clarify rather than inventing scope.

3. **Prework — get a clean branch.**
   - Run `git status` first. If there's uncommitted work, stash it
     (`git stash push -u -m "..."`) rather than losing or force-carrying it
     onto the new branch — don't `checkout`/`reset --hard` over it. If it's
     ambiguous whether the uncommitted work belongs to this ticket or a
     different one, ask.
   - `git checkout master`
   - `git pull origin master`
   - `git checkout -b <branch-name>` — derive the name from the ticket's
     key and title (same convention as `/ship`):
     `MB-I<ticket-number>-<Title-Case-Words>`, e.g.
     `MB-I21-Academy-Course-Search`. Prefer reusing the ticket's own title
     wording over inventing new phrasing. (Older branches in this repo are
     bare kebab-case slugs — don't copy that; new branches carry the key.)

4. **Implement.** Work through the Acceptance Criteria list from step 2,
   updating `TodoWrite` as you go. Investigate the "Affected Areas" the
   ticket names (if present) as your starting point, but verify against the
   actual codebase rather than trusting the ticket's pointers blindly —
   it's a triage hint, not a code map. Follow this repo's normal engineering
   conventions (`CLAUDE.md` + `AGENTS.md`: module layout under
   `src/modules/`, `ROUTES` + `getLocalizedRoute` for hrefs, `en.ts`/`ar.ts`
   edited together, no raw HTML elements in feature UI) — this skill only
   covers getting from "ticket" to "branch with work in progress," not a
   separate implementation methodology.

5. **Stop short of shipping.** This skill ends once the implementation
   satisfies the acceptance criteria (or you've hit a genuine blocker worth
   surfacing to the user). Committing, pushing, and opening a PR is
   `/ship`'s job — don't run it automatically; let the user review the
   diff and decide when it's ready to ship.

## Notes

- If the user gives a ticket ID that turns out to already be in progress
  (an existing local or remote branch matching its key), check out that
  existing branch instead of creating a duplicate — ask if it's unclear
  whether to resume it or start fresh.
- Same Git Safety Protocol as elsewhere in this repo: never force-push,
  never discard uncommitted work, never skip hooks.
- This skill assumes the ticket lives in the Zoho Sprints
  workspace/project documented in `/create-ticket`'s SKILL.md (teamId
  `150001150029`, projectId `1335000000017077`, prefix `MB`). If a ticket ID
  doesn't resolve there, don't guess a different workspace or reach into the
  sibling `MFQ` portal project — ask.
