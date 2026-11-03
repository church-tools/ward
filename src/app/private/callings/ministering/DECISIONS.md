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
- The preview is the only guard against a bad parse: the approve button has no confirmation dialog, and nothing checks the report for completeness before the delete. Correctness rests on the human reading the preview. The parser itself is covered by `ministering-import.spec.ts` (synthetic text runs, no PDF); nothing tests the write sequence.
- The snapshot includes the unit's *people*: an import also creates the members and households it cannot match, before it touches a single assignment. See "The import creates what it cannot match".

## 2026-11-02 — Companionship order is stored on the member and the household

`ministering_position` sits on `member` and `household`, not on the two assignment tables, so a person carries exactly one ministering order for the whole unit. This is the order inside a companionship *and* the order in the unassigned trays — the same column answers both, because an unassigned brother keeps the order he had.

This only holds because a reassignment **moves**: dropping a brother on another companionship deletes his previous assignment rather than adding a second one, and the same is true of a household. A member cannot hold two positions, so a copy would need a position per assignment instead.

### Consequences

- Reordering inside a companionship, or inside a tray, rewrites a `member`/`household` row — a drag is not confined to the assignment table.
- `ministering_position` is *not* registered as the `member` table's `orderKey` in SupaSync: that info object is unit-wide, and `RowCardList<'member'>` would start ordering the members page and the household member list by ministering order too.
- Every unassigned row is at `0` until something writes it, so every order needs a name tiebreak behind it.

### Considered options

- **Position on the assignment rows** — correct if a member may sit in several companionships (an elders quorum and a relief society companionship could both be given the same household), at the cost of two order columns and a rule for which one the trays read.

## 2026-11-02 — The board is the only source of districts and companionships

There is no ministering report import yet, so `/callings/ministering` has to be able to create its own structure: a new district, a new companionship inside a district, and deletion of both. A district may only be deleted while it has no companionships — `ministering_area.ministering_district` is NOT NULL, and whether the deployed FK cascades is not something the page should rely on.

Every mutation on the board — assignment, ordering, creation, deletion — is gated behind `AdminService.editMode`, the same unit-admin switch the organizations and agenda pages already use.

### Consequences

- An empty companionship is a legal state: it is what the insert card leaves behind before a brother is dropped into it. It is not auto-deleted when its last minister leaves, because that would silently take its household assignments with it.
- The import decision above still wins later: a report replaces every area, so anything created here is disposable by design.

## 2026-11-02 — Reordering districts and companionships is edit-mode only

`ministering_district.position` and `ministering_area.position` order the board, and drag-reordering them is available only in edit mode, matching every other mutation on this page. The order inside a companionship is a different gesture with a different target, so the two must not compete for the same pointer: a district or companionship is dragged by an explicit handle, while a brother or household is dragged by its own body.

### Consequences

- Three drop-list levels are nested (districts, companionships, and the two columns inside a card). The card's handle is the only drag origin that reorders cards; without it a drag aimed at the ministers column would move the whole card.
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
- Reading the report is split: `parseReport` and `resolveReport` in `modules/ministering/ministering-import.ts` are pure, and `MinisteringService.parseReport` supplies the file and the unit's rows. Keeping the data access in the service also keeps the parser's spec free of the app's data layer.
- The approve button is rendered only in edit mode, like the link that opens the page. The write lives in `MinisteringService.importReport`, so the board's six live signals are reloaded when it finishes.
- A name the unit does not have is not an error: the preview marks it with `+`, lists it under "will be created", and the import creates it.

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

- A printed `Family, Given` is matched by that pair; failing that, by a first name unique inside the
  resolved household; otherwise it is created. Guessing further — a unit-wide first-name match or a
  prefix rule like `matchSlot` — could hand a family to the wrong brother, so a false negative (a
  duplicate person) is the accepted failure.
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
- A report whose companionships all fail to parse is not imported at all: the parse returns a
  `problem` key and the page renders no approve button.

## 2026-11-02 — Known limits of the board

Three things the board does not handle, recorded so they are not rediscovered as surprises.

### A hard delete leaves no trace for other devices

`ministering_area` and `ministering_district` have no `deleted` column, so a delete is a real `DELETE`. SupaSync's incremental pull only asks for rows with `updated_at >` the last sync, so a second device never learns the row is gone; its own later edits to that row match zero rows remotely and vanish silently. Closing it needs a tombstone column or a forced resync after a hard delete, neither of which exists.

### SupaSync does not publish its own inserts and deletes

`insert` and `delete` write IndexedDB without emitting `onChange`, so a page fed only by subscriptions never sees its own writes until a realtime echo arrives. The board re-reads its six tables after every mutation instead. Online this is redundant; offline it is the only thing that makes a drop visible.

### A queued insert can still outlive a delete it raced

`delete` now clears the queue entry for the row first, which covers unassigning straight after assigning. If the send was already in flight the delete still lands before the insert, so the row can come back on the next sync. Deleting through the queue as well would close it.
