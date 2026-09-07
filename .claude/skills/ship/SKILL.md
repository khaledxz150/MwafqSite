---
name: ship
description: "Check out a new branch for the current changes, commit them, push, and open a GitHub PR against master — in one flow. Use when the user asks to 'checkout and commit', 'ship this', 'create a PR for these changes', or similar end-to-end branch/commit/PR requests."
trigger: /ship
---

# /ship

Take whatever is currently changed in the working tree and turn it into a
branch, a commit, and an open PR — the full local-to-remote handoff in one
pass.

## Branch model for this repo

- **`master` = dev/integration branch.** `/ship` always targets `master`.
- **`main` = production.** Reached only via `/ship-prod`, never from here.

## Usage

```
/ship                     # infer branch name + commit message + PR from the diff
/ship MB-I21 <summary>    # use a specific ticket key, e.g. from a just-created ticket
```

## Workflow

1. **Check state first.** Run `git status` and `git diff` (staged + unstaged).
   If there's nothing changed, stop and say so rather than creating an empty
   branch/PR. If already on a feature branch (not `master`/`main`) with the
   same changes already committed, skip straight to push + PR (step 4)
   instead of branching again.

2. **Branch name.** Use `MB-I<ticket-number>-<Title-Case-Words>` (e.g.
   `MB-I21-Academy-Course-Search`). If the user gave a ticket key (or one was
   created earlier in the conversation via `/ticket`, or picked up via
   `/pickup-ticket`), use it. If not, and there's no way to infer one, use a
   kebab-case slug without the `MB-I<n>-` prefix rather than inventing a
   ticket number. Create and switch to the branch with
   `git checkout -b <branch-name>` — if you're currently on `master` (or
   `main`) with unrelated uncommitted work, check `git status` and sort that
   out before anything destructive (see Git Safety Protocol).

3. **Commit.** Stage the relevant files by name (not `-A`/`.`) and write a
   commit message with an imperative present-tense summary line, a blank
   line, then 1-2 sentences of *why* — e.g. "Enable course search on the
   academy listing page" / "Adds a search field to the courses toolbar so
   visitors can filter without scrolling the full catalogue." Don't imitate
   this repo's older `save` / `some fixes` commits — they're not the
   convention to follow. If a ticket key is known (branch name carries
   `I<n>`, or one was created/picked-up earlier in the conversation), add a
   `Ticket:` trailer line with the ticket URL (see "Ticket URL format"
   below) directly above `Co-Authored-By`:
   ```
   Ticket: https://sprints.zoho.sa/workspace/mwafqportal#P4/itemdetails/I21

   Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
   ```
   Omit the `Ticket:` line entirely if there's no associated ticket — don't
   invent one. Never use past-tense changelog verbs like "Fixed X" without
   the why.

4. **Push.** `git push -u origin <branch-name>`.

5. **Create the PR** with `gh pr create --base master`. Base branch is
   `master` — this repo always lands feature work in `master` first.
   Promoting a merged `master` change to production (`<branch>-prod` →
   `main`) is a separate, explicit step handled by the `/ship-prod` skill;
   don't do it here and don't target `main` from this flow unless the user
   explicitly overrides the base for this one PR.
   - Title: short (<70 chars), same imperative style as the commit summary.
   - Body: just a short Summary section (bullet points, why this change
     matters). Don't add a Test plan section — no checklist, no TODO items
     for the reviewer.
   - If a ticket exists (Zoho Sprints item number), reference it in the PR
     body with both a short reference and the full ticket URL (see "Ticket
     URL format" below), e.g.:
     ```
     Ref MB-I21 — https://sprints.zoho.sa/workspace/mwafqportal#P4/itemdetails/I21
     ```
     so the two stay linked and the URL is one click away from the PR.
   - Assignee/reviewer: assign the PR to whoever's `gh` account created it
     (`--assignee @me`), and add Emran Aloul (`emranaloul`) as a reviewer
     (`--reviewer emranaloul`) only when he isn't the one who created it.

6. **Report back** the PR URL. Do not merge it — opening the PR is the end
   of this flow, merging is a separate, explicit user action.

## Ticket URL format

This project's Zoho Sprints item URL is:
```
https://sprints.zoho.sa/workspace/mwafqportal#P4/itemdetails/I<itemNo>
```
`P4` is this project's (Mwafq - B2C) project number — don't recompute it,
it's fixed for this repo, and it is **not** the portal repo's `P2`.
`<itemNo>` is the plain ticket number (e.g. `21` for `I21`/`MB-I21`), not the
internal `itemId`.

## Notes

- This is the same Git Safety Protocol as the rest of the session: never
  force-push, never skip hooks, never commit unless there are real changes
  to commit, always create a new commit rather than amending.
- If `gh pr create` fails because the branch has no upstream or diverges,
  fix that (push first) rather than forcing.
- If unsure which base branch a PR should target, ask — but the default for
  `/ship` is always `master`; only deviate on explicit instruction.
- To promote an already-merged `master` change to production, use
  `/ship-prod` instead of trying to redo this flow with a different base.
