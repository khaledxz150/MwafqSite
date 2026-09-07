---
name: ship-prod
description: "Promote an already-merged master change to production by cherry-picking it onto a fresh <branch>-prod branch off main and opening a PR to main. Use when the user asks to 'ship this to prod', 'promote to production', 'push this to main', or similar — after the corresponding change has already landed in master via /ship."
trigger: /ship-prod
---

# /ship-prod

Promote a change that has already been merged into `master` up to `main`,
following this repo's prod-promotion pattern: a `<branch>-prod` branch cut
from `main`, containing a cherry-pick of the original feature commit(s), PR'd
straight to `main`.

## Branch model for this repo

- **`master` = dev/integration branch.** `/ship` lands work here.
- **`main` = production.** `/ship-prod` is the only path here.

This is a **separate, later step** from `/ship` — `/ship` lands work in
`master`; `/ship-prod` is run afterward (often in a different session, once
the `master` change has been verified) to carry it to production. Never use
this skill to bypass `master` for a change that hasn't been merged there
yet — if `git log origin/master` doesn't contain the commit(s) you're about
to promote, stop and say so instead of proceeding.

## Usage

```
/ship-prod                          # infer the branch/commits from the
                                     # most recently shipped work in this
                                     # conversation
/ship-prod MB-I21-Academy-Search    # promote a specific merged branch
/ship-prod 469                      # promote by master PR number
```

## Workflow

1. **Identify the source.** Figure out which merged `master` branch/PR is
   being promoted:
   - If the user named a branch or PR number, use it.
   - Otherwise, infer it from the most recent `/ship` in this conversation.
   - If genuinely ambiguous, ask rather than guessing — promoting the wrong
     change to `main` is not a cheap mistake to undo.

2. **Confirm it's actually merged.** Run `git fetch origin main master` and
   check the source branch/commits are reachable from `origin/master`
   (`git log origin/master | grep <commit>` or `git branch -r --contains
   <commit>`). If it isn't merged into `master` yet, stop — tell the user to
   `/ship` and merge that PR first.

3. **Find the commits to cherry-pick.** List the non-merge commits unique to
   the source branch that represent the actual change:
   ```
   git log --no-merges --oneline origin/main..<source-branch-or-tip-of-merge>
   ```
   Read each commit — exclude anything clearly unrelated to the shipped
   feature (e.g. an incidental tooling/config commit that happened to ride
   along on the same branch). If it's not obvious which commits belong,
   list them for the user and ask before picking.

4. **Cut the prod branch from `main`.**
   ```
   git checkout main
   git pull origin main
   git checkout -b <source-branch-name>-prod
   ```
   `<source-branch-name>` is the exact `master`-side branch name (matches
   this repo's convention, e.g. `MB-I21-Academy-Course-Search` →
   `MB-I21-Academy-Course-Search-prod`).

5. **Cherry-pick.** Apply the commits identified in step 3, oldest first:
   ```
   git cherry-pick -x <sha1> <sha2> ...
   ```
   `-x` records the original commit in the message. If a cherry-pick
   conflicts, stop and resolve it deliberately (read the conflicting hunks,
   don't blindly take `--ours`/`--theirs`) — or hand it back to the user if
   the resolution isn't obvious. Never `git cherry-pick --abort` silently and
   declare success; if you abort, say so and report the branch is left
   unfinished.

6. **Push.** `git push -u origin <source-branch-name>-prod`.

7. **Create the PR** with `gh pr create --base main`.
   - Title: reuse the original `master`-side PR/commit's summary verbatim —
     the prod PR should read as "the same change, now going to prod," not a
     new description.
   - Body: short — a one-line pointer back to the `master` PR (e.g.
     "Promotes #465 to production.") is enough; don't re-derive a full
     Summary/Test plan template, the review already happened at the `master`
     stage. If a ticket exists, add the full ticket URL on its own line too
     (see "Ticket URL format" in the `ship` skill), e.g.:
     ```
     Promotes #465 to production.

     Ref MB-I21 — https://sprints.zoho.sa/workspace/mwafqportal#P4/itemdetails/I21
     ```
   - Assignee/reviewer: same rule as `/ship` — always assign the PR to
     whoever's `gh` account created it (`--assignee @me`), and add Emran
     Aloul (`emranaloul`) as a reviewer (`--reviewer emranaloul`) only when
     he isn't the one who created it.

8. **Report back** the PR URL. Do not merge it — same rule as `/ship`,
   opening the PR ends this flow.

## Notes

- Never force-push, never skip hooks, never rewrite already-pushed history
  on `main` or `master` — same Git Safety Protocol as everywhere else in
  this repo.
- Don't invent a `-prod` branch name that doesn't match the source branch
  name exactly plus the `-prod` suffix — consistency here is what makes the
  `master`↔`main` pairing discoverable later (`git branch -a | grep <ticket>`).
- If `origin/main` has moved since the `master` merge and the cherry-pick
  would land on top of unrelated newer prod commits, that's expected — prod
  branches are always cut fresh from the current `main` tip, not from an
  older snapshot.
- If `gh pr create` fails because the branch has no upstream, push first
  rather than forcing.
