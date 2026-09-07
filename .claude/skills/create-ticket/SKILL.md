---
name: create-ticket
description: "Draft a ticket (title + description) for a piece of work — for filing before the work starts, or for documenting already-finished work as a forward-looking spec. The description is always written as requirements to satisfy, never as a changelog of what was done. Use when the user asks to 'create a ticket', 'write a ticket', 'file an issue', or 'draft a task' for something discussed in the conversation."
trigger: /ticket
---

# /ticket

Turn a piece of work — planned or already completed in this conversation — into a
ticket that reads like a spec, not a changelog.

## Usage

```
/ticket                         # draft AND file a ticket for whatever was just discussed/done
/ticket <topic or task>         # draft AND file a ticket for a specific topic
/ticket <ticket-key> <topic>    # use a specific key, e.g. /ticket MB-I21 academy course search
/ticket draft <topic>           # draft only — print markdown, do not create the Zoho item
```

**Every `/ticket` invocation always creates the real Zoho Sprints item by
default** — filing is not an opt-in extra, it's the normal outcome. Use
`/ticket draft ...` (or an explicit "just draft it" / "don't file this yet"
from the user) for the rare case where only the markdown is wanted.

## The core rule

**Write the description as what SHOULD be done, not what WAS done.**

Even if the work is already finished (e.g. the user did it earlier in this
session and now wants a ticket for the record), the ticket must read as if it
were filed *before* the work started: present-tense problem statement,
imperative requirements, testable acceptance criteria. Never say "added",
"fixed", "refactored", "implemented", "simplified" — those are changelog verbs
and belong in a commit message or PR description, not here.

Banned phrasing → required phrasing:

| Don't (changelog / past tense)             | Do (spec / requirement)                         |
|--------------------------------------------|-------------------------------------------------|
| "Merged the two sections into one"         | "Show all services in a single section"         |
| "Removed the FAQ block"                    | "Remove the FAQ block from the home page"       |
| "Added an Arabic translation"              | "Home hero must render in Arabic (RTL)"         |
| "Fixed the locale redirect"                | "Locale redirect must preserve query params"    |
| "Refactored HomeView"                      | (omit — implementation detail, not a ticket concern) |

If you catch yourself writing a past-tense verb describing an edit, stop and
rephrase it as a present-tense requirement.

## What goes in, what stays out

- **In**: the problem/goal, the desired end-user-visible behavior, acceptance
  criteria, and (optionally) a short "affected areas" pointer so whoever picks
  it up knows roughly where to look.
- **Out**: specific file names, function names, "how" implementation detail,
  reasoning-in-the-moment ("I checked X and found Y"), and any first-person
  narration of the work session. A ticket is read by someone who wasn't in
  this conversation — write for them, not as a record for yourself.
- If the work is retroactive (already done), do **not** mention that fact in
  the ticket body at all. The ticket should be indistinguishable from one
  filed up front. If the user wants to note it was already implemented, that
  belongs in your reply to them, not in the ticket text.

## Title format

Pattern is `<KEY> <Area> — <imperative summary>` or `<KEY> <imperative
summary>`, e.g. `MB-I21 Academy — Add course search to the listing page`.
This repo's own `git log` is not a reliable style source (it carries many
`save` / `some fixes` commits) — follow the pattern above, not the history.
Zoho Sprints assigns the real item number (`I<n>`) automatically on create —
the title sent to `CreateItem` must never contain a placeholder like
`MB-I<TBD>`. Omit the key from the title entirely when filing; the item
number becomes known only after `CreateItem` returns, and step 8 below
reports it back. A placeholder key is only ever acceptable in a `draft`-only
response shown in chat (never filed) when the user explicitly wants to see
where a key would go.

Keep the title under ~70 characters, specific enough to disambiguate from
similar tickets, phrased as the outcome (not the mechanism):

- Good: "Academy — Show course search on the courses listing page"
- Bad: "Update CoursesListView.tsx" (names an implementation file)
- Bad: "Fixed academy search" (past tense, vague)

## Description template

```markdown
## Summary
<1-3 sentences: what's wrong or missing today, and why it matters, from the
user/business point of view. No implementation detail.>

## Current Behavior
<Factual, present-tense description of how it works today — the "before"
state a reader unfamiliar with the recent session would observe by using the
product right now.>

## Requirements
- <Imperative, testable requirement>
- <Imperative, testable requirement>
- <...>

## Acceptance Criteria
- [ ] <Observable, checkable outcome>
- [ ] <Observable, checkable outcome>

## Affected Areas
<Optional — page/route/module names only, e.g. "Academy → Courses listing".
Omit file paths and code symbols; this is for routing/triage, not a code map.>

## Out of Scope
<Optional — only include if there's a real risk of scope creep worth
flagging.>
```

This is a bilingual site (`en` + `ar`, RTL). When a ticket touches user-facing
copy or layout, state the locale expectation as an explicit requirement (both
locales, RTL correctness) instead of leaving it implicit.

## Description must be filed as HTML

The template above is markdown for readability, and you should still **present**
the draft to the user as markdown in chat. But the Zoho Sprints `description`
field is rendered as **HTML, not markdown** — filing raw markdown makes `##`,
`-`, and newlines appear as literal text. So when you call `CreateItem` /
`UpdateItem`, convert the body to HTML:

- `## Heading` → `<h2>Heading</h2>`
- Bullet list → `<ul><li>…</li><li>…</li></ul>`
- Acceptance-criteria checkboxes: drop the `- [ ]` markdown and use plain
  `<ul><li>…</li></ul>` (Zoho has no markdown checkbox; the list item is enough).
- Paragraphs → `<p>…</p>`; do **not** rely on `\n` for line breaks.
- Inline code / field names → `<code>getLocalizedRoute</code>`.
- Escape literal HTML-significant characters: `&` → `&amp;`, `<` → `&lt;`,
  `>` → `&gt;`. Use `&rarr;` for the `→` in "Affected Areas" breadcrumbs.

## Workflow

1. Identify the task: use what's given as an argument, or infer it from the
   most recent substantive piece of work in the conversation if no argument
   is given. If genuinely ambiguous (multiple candidate tasks, or no work
   discussed yet), ask the user which one before drafting.
2. Strip the task down to its requirement-shape: what changes for the user or
   the system, stated as an outcome. Discard the "how" — file paths, function
   names, library choices, the order you tackled things in.
3. Fill in the template above. Skip optional sections that would be empty or
   trivial rather than padding them out.
4. Present the ticket as a single markdown block (title as an H1 or bold
   line, then the body) so the user can see exactly what will be filed.
5. If the user gives a ticket key/number, use it verbatim in the title. If
   they don't, leave a clearly-marked placeholder rather than guessing a real
   key.
6. Immediately continue into "Filing via the Zoho Sprints MCP server" below
   and create the item — do not stop after drafting and wait to be told to
   file it. Only skip filing if the invocation was `/ticket draft ...` or the
   user explicitly said not to file it (this turn or as standing guidance
   earlier in the conversation).

## Filing via the Zoho Sprints MCP server

Filing is the default behavior of `/ticket` (see above) — draft the ticket
per the workflow above, then immediately create it as a work item via the
connected `zoho-sprints` MCP server's `ZohoSprints_CreateItem` tool.

**This repo's workspace/project (Mwafaq workspace → Mwafq - B2C)** — reuse
these instead of rediscovering them:

| Field | Value |
|---|---|
| teamId | `150001150029` |
| projectId | `1335000000017077` (Mwafq - B2C, **Kanban** — no real sprints) |
| project key prefix / number | `MB` / `P4` |
| sprintId to use on create | `1335000000017079` (the project's backlog ID — Kanban items live here, not in a sprint) |
| kanban sprintId | `1335000000017080` (the actual Kanban board — move every new item here) |
| creator userId (Emran Aloul) | `1335000000030001` (used for the always-assign-to-creator step) |

Item type IDs (`projitemtypeid`) observed in this project — **this list is
incomplete**; only `Story` has been seen in use here, and other types (Task,
Bug) may exist unobserved:

| Name | ID |
|---|---|
| Story | `1335000000017101` |

Priority IDs (`projpriorityid`):

| Name | ID |
|---|---|
| None | `1335000000017095` |
| Low | `1335000000017096` |
| Medium | `1335000000017097` |
| High | `1335000000017098` |

Status IDs observed on this board: To do `1335000000008495`, In progress
`1335000000008497`, Done `1335000000008499`.

Do **not** reuse the sibling Mwafq portal repo's IDs (projectId
`1335000000015008`, prefix `MFQ`) here — they belong to a different project.
If a different project is ever targeted, re-derive its IDs via `GetProjects`
→ `GetProjectDetails` (action `getbacklog`, or `GetSprints` if it's Agile) →
`GetProjectPriorities`, and sample a couple of existing items via
`GetItems`/`GetItemDetails` to learn that project's item-type IDs (there's no
direct "list item types" tool).

**Steps:**

1. Draft the ticket per the workflow above first — do not skip straight to
   filing an undrafted ticket. Show at least the title so the user can catch
   anything wrong before it becomes a real tracker item.
2. Use item type `Story` and priority `Medium` by default — do not stop to ask
   for these on every ticket, filing should proceed without a pause. Only
   deviate when the user specifies a type/priority for this ticket (use
   theirs), or when the work is clearly a defect fix rather than new/changed
   behavior (favor a `Bug`-shaped framing if that type exists in this
   project — derive its real ID first, never guess an ID; otherwise note it
   in the title/summary).
3. Map the draft into `CreateItem`'s fields: ticket title → `name`; the ticket
   body (Summary/Current Behavior/Requirements/Acceptance Criteria) →
   `description`, **converted to HTML** — see "Description must be filed as
   HTML" above.
4. If the tool errors with `Invalid oauthscope`, the Sprints connection needs
   re-authorization (likely because tools were added after the last consent)
   — tell the user to re-authorize in the `mcp.zoho.com` console, then retry.
   If it errors because the server needs OAuth at all, tell the user to run
   `/mcp` in an interactive session. Do not ask the user for tokens, codes, or
   callback URLs either way.
5. After a successful create, verify with `GetItemDetails` before reporting
   success — don't claim the ticket exists based only on `CreateItem`'s
   return value.
6. **Always move the new item onto the Kanban board** — items created via
   `CreateItem` land in the backlog sprint (`1335000000017079`), but they
   should always end up visible on the actual Kanban board
   (`1335000000017080`), not sitting in the backlog. Move it immediately
   after creation, every time, regardless of item type or priority:
   ```
   ZohoSprints_MoveItem
   query_params: { action: "moveitem", itemidarr: '["<addedItemId>"]', toprojectid: "1335000000017077", tosprintid: "1335000000017080" }
   path_variables: { teamId: "150001150029", projectId: "1335000000017077", sprintId: "1335000000017079" }
   ```
   `itemidarr` must be a JSON-array-encoded *string* (e.g. `'["1335...5"]'`),
   not a bare id or a real array — a bare id 400s with "Given JSON is
   invalid". `addedItemId` comes straight from `CreateItem`'s response.
7. **Always assign the item to its creator** — the same person on whose
   behalf the ticket is being filed (the connected Zoho account, e.g. Emran
   Aloul → user ID `1335000000030001` in this workspace). `CreateItem` has no
   assignee field, so do this as a follow-up `UpdateItem` call right after
   the move-to-board step:
   ```
   ZohoSprints_UpdateItem
   query_params: { newusers: '["<creatorUserId>"]' }
   path_variables: { teamId: "150001150029", projectId: "1335000000017077", sprintId: "1335000000017080", itemId: "<addedItemId>" }
   ```
   Like `itemidarr`, `newusers` must be a JSON-array-encoded *string*, not a
   bare id — a bare id 400s with "Given JSON is invalid". If the creator's
   user ID isn't already known from this workspace, derive it once via
   `GetItemDetails` on any item they created (`createdBy` field, cross-
   referenced against `userDisplayName`) and reuse it afterward.
8. Report back the item number (e.g. `I21`) and ID so the user can open it
   in Sprints, now sitting on the Kanban board's To Do column and assigned
   to them. The ticket URL format lives in the `ship` skill.
