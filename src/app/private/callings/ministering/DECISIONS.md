# Decisions — Ministering

Design decisions for ministering assignments and the ministering report import.

## 2026-10-29 — Assignments reference a household, not a member

LCR's ministering report assigns whole families, while `member_ministered_in` was built member-by-member. We dropped its `member` column and gave it `household` (FK to `household(id, unit)`, mirrored by `member.household`). A single person is represented as a one-member household, which is exactly how LCR treats them, so one row per assigned household covers every case and there is a single answer to "who is being ministered to".

### Consequences

- Reports count households, not people; per-person views join `member.household`.

## 2026-10-29 — Importing a ministering report replaces every assignment in the unit

A ministering report is a complete snapshot, so the import deletes the unit's areas and assignment rows and writes the snapshot fresh, rather than diffing against what is stored. Households are the exception: they survive, because `member.household` points at them, and they are recognised by their member set — never deleted by an import.

### Considered options

- **Diff and reconcile**, matching a companionship by its set of ministering members: preserves area ids and yields a meaningful "3 added / 1 removed" preview, at the cost of identity rules that have to stay correct forever.
- **Append only**, like the member importer: silently accumulates stale assignments, since companionship changes are the normal case.

### Consequences

- Area and district ids churn on every import, so nothing durable may hang off them (notes, history, external references).
- The delete happens before the insert and there is no transaction: a failure between the two leaves the unit with no ministering data until the PDF is uploaded again. This was accepted knowingly — do not "fix" it by adding an insert-then-delete phase without revisiting the trade-off.
- The previews are the only guard against a bad parse: neither Import button has a confirmation dialog, and nothing checks the report for completeness before the delete. Correctness rests on the human reading them. The parser itself is covered by `ministering-import-page.spec.ts` (synthetic text runs, no PDF); nothing tests the write sequence.
- The snapshot includes the unit's *people*: an import also creates the members and households it cannot match, before it touches a single assignment, as its own confirmed step. See "The import creates what it cannot match" and "The import is two confirmed steps".

## 2026-11-02 — Companionship order is stored on the member and the household

`ministering_position` sits on `member` and `household`, not on the two assignment tables, so a person carries exactly one ministering order for the whole unit. This is the order inside a companionship *and* the order in the unassigned trays — the same column answers both, because an unassigned brother keeps the order he had.

This only holds because a reassignment **moves**: dropping a brother on another companionship deletes his previous assignment rather than adding a second one, and the same is true of a household. A member cannot hold two positions, so a copy would need a position per assignment instead.

### Consequences

- Reordering inside a companionship, or inside a tray, rewrites a `member`/`household` row — a drag is not confined to the assignment table.
- `ministering_position` is *not* registered as the `member` table's `orderKey` in SupaSync: that info object is unit-wide, and `RowCardList<'member'>` would start ordering the members page and the household member list by ministering order too.
- Every unassigned row is at `0` until something writes it, so every order needs a name tiebreak behind it.

### Considered options

- **Position on the assignment rows** — correct if a member may sit in several companionships (an elders quorum and a relief society companionship could both be given the same household), at the cost of two order columns and a rule for which one the trays read.

## 2026-11-02 — The board is the only source of hand-made districts and companionships

The board creates its own structure: a district, a companionship inside it, and deletion of both. A district may only be deleted while it has no companionships — `ministering_area.ministering_district` is NOT NULL, and whether the deployed FK cascades is not something the page should rely on. The guard is the delete button's disabled state, because the district goes through `RowCardList`'s own `onRemove`.

Both go through `RowCardList` (`ministering_district`) rather than the service: cards are created by its insert card and removed by its `onRemove`. A write through `MinisteringService` instead would leave the list unchanged, because SupaSync does not publish inserts and deletes to subscribers — see the known limits below.

Every mutation on the board — assignment, ordering, creation, deletion — is gated behind `AdminService.editMode`, the same unit-admin switch the organizations and agenda pages already use.

### Consequences

- An empty companionship is a legal state: it is what the insert card leaves behind before a brother is dropped into it. It is not auto-deleted when its last minister leaves, because that would silently take its household assignments with it.
- The import decision above still wins later: a report replaces every area, so anything created here is disposable by design.

## 2026-11-02 — Only companionships reorder by drag

`ministering_area.position` orders the cards inside a district, and drag-reordering them is available only in edit mode. The order inside a companionship is a different gesture with a different target, so the two must not compete for the same pointer: a companionship is dragged by an explicit handle, while a brother or household is dragged by its own body.

A district does **not** reorder: it is a `RowCardList` with `fixedOrder`, and its cards never drag. That is deliberate rather than a lost feature — `CardList` drags a card from anywhere on it, which would fight every drop list nested inside a district card.

### Consequences

- Three drop-list levels remain (the district list, the companionships inside a district, and the two columns inside a card), but only the lower two accept drags from a handle.
- `CardList` still gets a `[cdkDragDisabled]` binding, in `card-list.html`: it is what keeps a district card's own drag out of the way when the list is not reorderable. It also stops read-only lists elsewhere in the app from dragging cards that have nowhere to go. See `shared/utils/DECISIONS.md`.
- Read-only viewers get the same board with no handles, no insert cards and no delete buttons.

## 2026-11-02 — The UI says companionship, the table says `ministering_area`

`GLOSSARY.md` defines the domain term as **Companionship**; `ministering_area` is the historical name on the four tables and stays. Code and UI use companionship, district and household, and only the database identifiers keep the old names.

### Consequences

- Reading the schema needs that one translation in your head: `ministering_area` is a companionship, `member_ministering_in` is its roster, `household_ministered_in` is the set of households it is assigned to.
- The same translation covers the constraint names that still say `member_ministered_in` after the table itself was renamed to `household_ministered_in`.

## 2026-11-02 — The import has a URL that is always a popover

The board's import button sits under the centre column, is gated behind edit mode like every other mutation there, and goes to `/callings/ministering/import`. That route is an `insideParent` child of `ministering` but the board hosts **no drawer outlet**: `MinisteringPage` watches `WindowService.currentRoute` and opens `MinisteringImportPage` as the app's overlay popover whenever that URL is active, closing it back to `/callings/ministering`.

The navigation replaces rather than pushes (`shouldReplaceHistory` already says every `insideParent` URL should), so Back leaves the board instead of returning to an overlay whose popover is gone.

This is one-off wiring, not the row-popover mechanism: `PopoverService`'s existing URL support is `?popover=<table>&id=<n>` resolved through a hardcoded table→page switch, which cannot express a fixed screen with no row. Reuse it only if a second fixed popover appears.

### Consequences

- A child route with no outlet renders nothing; the URL is real, the rendering is not. Anyone adding another `insideParent` child here gets a silent no-op, which is why this is written down.
- Reading the report is split: `parseReport` and `resolveReport` are pure functions of the extracted text and live beside the page in `import/ministering-import-page.ts`, while `MinisteringImportPage.readReport` supplies the file and the unit's rows. The spec imports that page module, so it runs with `src/test-setup.ts`'s `fake-indexeddb` shim even though it touches no database.
- Both Import buttons are rendered only in edit mode, like the link that opens the page. Reading and writing the report both live on `MinisteringImportPage`, so the board's six live signals are reloaded explicitly through `MinisteringService.reload()` at the end of each step.- A name the unit does not have is not an error: the preview marks it with `+`, lists it under "will be created", and the import creates it.

## 2026-11-02 — The import creates what it cannot match

A report names people the unit may not have yet — a move-in, a household the member import has not
seen. The import creates them instead of refusing, so any report is applicable. Creation runs before
the destructive half, so a failure there leaves the old assignments intact.

### Households

- A printed family name is matched against `household.name`, whole or the part before the comma: the
  member import writes `Family, First`, this import writes `Family`.
- A name held by several households is decided by where the printed members already live (most
  members wins, ties by lowest id). When no name matches, the household those members already live in
  is still the household the report describes.
- When neither works the household is created with the printed family name. The member import matches
  households by the full `Family, First` string, so a created `Family` is a different key and a
  second household can appear for that family later. Accepted: the alternative was a name the report
  does not print.

### People

- A printed `Family, Given` is matched against stored rows by surname and given name, where a stored
  first name counts as a match for any printed name that starts with it as a whole word; failing
  that, by a first name unique inside the resolved household; otherwise it is created. Guessing
  further — a unit-wide first-name match or a prefix rule like `matchSlot` — could hand a family to
  the wrong brother, so a false negative (a duplicate person) is the accepted failure.
- A created member stores one given name, not the printed list: the first word, plus a trailing
  number when the report prints one (`Daniel III`). A second person of the same family who would end
  up with the same name takes the next word instead (`Daniel Diether IV`). That is why matching has
  to accept a printed name that merely starts with the stored one — otherwise every import would
  create the same people again.
- A trailing bracketed word is the nickname, not a given name: `Ikwo, Ukiwe Kalu (Chucks)` stores
  `first_name` `Ukiwe` and `nick_name` `Chucks`.
- The same name printed twice for one household is two people — a father and a son — not one person
  placed twice. Each row claims the person it matched, so the second row never reuses the first
  row's stored or planned member, and a unit that already stores both keeps matching them one to
  one.
- Gender comes from the report's `male`/`female` column. Ministers print no gender at all, so a
  created minister is `male`, marked `shortcut:` in the code: it is a default, not something the
  report says.
- A created minister gets a one-member household of his own, named after his family name.

### Re-homing

The import also moves a matched member into the household the report prints him in, which is how a
family the unit stores as two households becomes one. This amends the older "editing households is
the only way to correct an assignment's membership": the report is LCR's statement about who lives
together, so it corrects that too. Nothing else about a household is touched — no name, no colours.

### The interviewer

`Presidency Member:` prints once per companionship block, and in two of the sample's five districts
the name changes partway through. `ministering_district.interviewer` is a single column, so the
import takes the line printed under the `Bezirk` header — the district's own — and ignores the ones
above the companionships. Nothing on the board reads the column yet.

### Consequences

- An import writes `member` and `household`, not just the four ministering tables, and inherits the
  member import's failure modes.
- Re-importing the same PDF is stable: the households and members it created are matched by the
  names the same parse produces.
- A report whose companionships all fail to parse is not imported at all: the page renders no
  steps and carries no message saying why.

## 2026-11-02 — Known limits of the board

Three things the board does not handle, recorded so they are not rediscovered as surprises.

### A hard delete leaves no trace for other devices

`ministering_area` and `ministering_district` have no `deleted` column, so a delete is a real `DELETE`. SupaSync's incremental pull only asks for rows with `updated_at >` the last sync, so a second device never learns the row is gone; its own later edits to that row match zero rows remotely and vanish silently. Closing it needs a tombstone column or a forced resync after a hard delete, neither of which exists.

### SupaSync does not publish its own inserts and deletes

`insert` and `delete` write IndexedDB without emitting `onChange`, so a page fed only by subscriptions never sees its own writes until a realtime echo arrives. The board re-reads its six tables after every mutation instead. Online this is redundant; offline it is the only thing that makes a drop visible.

### A queued insert can still outlive a delete it raced

`delete` now clears the queue entry for the row first, which covers unassigning straight after assigning. If the send was already in flight the delete still lands before the insert, so the row can come back on the next sync. Deleting through the queue as well would close it.

## 2026-11-03 — The import is two confirmed steps

The popover no longer writes the whole report on one button. It writes in two steps, each with its own preview and its own Import button:

1. **People** — the households and members the report names that the unit does not have, plus the rehomings that move a matched member into the household the report prints. Nothing is deleted; the only rows amended are rehomed members.
2. **Ministering** — districts, companionships, roster and assignments, replacing the unit's whole structure, plus `ministering_position` on every minister and assigned household.

Both steps are always shown: a report that creates nobody still gets its people step, whose button then only advances. The people step disappears once it has run — its rows exist, so a second press would re-insert them.

The real ids the people step hands out are stashed as `placeholder → id`, and the ministering step resolves its placeholders through that map, so its preview is exactly what the first step committed. Re-resolving the report after the insert was rejected: `resolveReport` would then match the created people by name and could choose a different household, so the second preview could differ from the one that was approved.

### Considered options

- **One approve, as before** — simplest, and it keeps the whole import in one write sequence, but the human confirms the destructive half and the additive half in the same click, and a partially applied import is invisible.
- **Re-resolve between the steps** — self-correcting against other devices, at the cost of a preview that can move under the cursor. Rejected for that reason.

### Consequences

- The destructive half is still a delete-then-insert with no transaction (see 2026-10-29). The split does not make it atomic; it only puts a human confirmation in front of the additive half.
- A failed people step leaves created people behind. That is the harmless direction the old "people first" ordering already chose, now visible and interruptible.
- The ministering step no longer merges changes into rows that are still only planned — the created people are ordinary stored rows by the time it runs — so the planned-row bookkeeping is gone.
- An unreadable PDF shows nothing at all: the page has no copy for failures, so the steps simply do not appear.
- Closing the popover between the steps gives up the parse; the PDF has to be uploaded again. The created people are already written and are matched by name on the next attempt.

## 2026-11-06 — The trays are edge panels, and decide their own drops

The two unassigned trays sit at the canvas edges instead of taking permanent board columns.
They reveal on hover, focus, or an approaching drag of the matching kind, and can be pinned.

Trays remain `cdkDropList` sources: without a container their items cannot enter companionships.
They refuse CDK entry because CDK caches list rectangles before the panel slides. The page uses
CDK's moved/released events for mouse and touch, not DOM pointer-enter/up on the tray.

Release snapshots which visible panel owns the pointer. The item's `dropped` event is the only
write path, checking that snapshot before the cached CDK destination behind it. This survives
CDK's `ended → item dropped → list dropped` ordering and the snap-back animation. A matching
tray unassigns once; a wrong-kind tray or a drop within the already-unassigned pool does nothing.
Ordinary companionship drops retain CDK's ordering. Touch cancellation and Escape suppress writes
(Escape does not end CDK's visual drag; release still finishes that gesture).

Subscriptions are removed on drop, the next drag, and page destruction. Existing edit-mode gates,
member-popover links and companionship ordering remain unchanged.

## 2026-11-06 — A brother opens the member popover, through the URL

Clicking a brother on the board (or in the unassigned tray) opens the shared member popover, the same way cards do elsewhere: the row is an `<a routerLink>` to `?popover=member&id=…`, and the page binds `bindRowPopoverRoute` so the query param is what actually opens and closes the overlay. Nothing is held in component state, so the URL is shareable and a reload lands on the same brother.

### Consequences

- CDK already swallows the click that ends a drag, so dragging a brother still never opens him.
- The popover is the row page, so edits made through it write the same `member` row the board reads.

## 2026-11-06 — The unassigned tray offers only brothers who can minister

`member.can_minister` gates the unassigned brothers list: the toggle on the member page is the only place a person is taken out of the pool, so a brother who is not to be assigned never clutters the tray. It is the tray only — an existing companionship keeps whoever it already holds, so clearing the flag never silently removes an assignment.

### Consequences

- Brothers who can minister but are already assigned stay off the tray for the usual reason (they have an area), not because of the flag.
- An import that never sets `can_minister` leaves whatever the database default gives that row, so a unit that wants the flag to matter has to check imported members.

## 2026-11-06 — The ministering import clears `can_minister` for every brother it leaves unassigned

The report is the unit's whole ministry picture, so a brother who appears in no companionship of a successful import is not available to minister: the import writes `can_minister = false` on him. Combined with the tray filter, the tray after an import holds exactly the people the report does not know about — no stale pool of people LCR has already stopped assigning.

### Consequences

- Assigning a brother by hand is the only way back into the tray: the member page's switch, or a new report that assigns him (which imports do not touch the flag for).
- The write rides the existing `member` update batch of the ministering step, after the companionships are known and before anything is deleted; rows already `false` are not rewritten.
- The people step is unaffected: a member it creates keeps the database default until a later import of his own either assigns him or clears him.
