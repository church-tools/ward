# Decisions — Ministering

Design decisions for ministering assignments and the ministering report import.

## 2026-10-29 — Assignments reference a household, not a member

LCR's ministering report assigns whole families, while `member_ministered_in` was built member-by-member. We dropped its `member` column and gave it `household` (FK to `household(id, unit)`, mirrored by `member.household`). A single person is represented as a one-member household, which is exactly how LCR treats them, so one row per assigned household covers every case and there is a single answer to "who is being ministered to".

### Consequences

- Reports count households, not people; per-person views join `member.household`.
- The import must guarantee every member has a household, which means it also creates households for members that appear in none of the PDF's assigned groups.
- Editing households is the only way to correct an assignment's membership; no UI for that exists yet.

## 2026-10-29 — Importing a ministering report replaces every assignment in the unit

A ministering report is a complete snapshot, so the import deletes the unit's areas and assignment rows and writes the snapshot fresh, rather than diffing against what is stored. Households are the exception: they survive, because `member.household` points at them, and they are recognised by their member set — never deleted by an import.

### Considered options

- **Diff and reconcile**, matching a companionship by its set of ministering members: preserves area ids and yields a meaningful "3 added / 1 removed" preview, at the cost of identity rules that have to stay correct forever.
- **Append only**, like the member importer: silently accumulates stale assignments, since companionship changes are the normal case.

### Consequences

- Area and district ids churn on every import, so nothing durable may hang off them (notes, history, external references).
- The delete happens before the insert and there is no transaction: a failure between the two leaves the unit with no ministering data until the PDF is uploaded again. This was accepted knowingly — do not "fix" it by adding an insert-then-delete phase without revisiting the trade-off.
- The preview is the only guard against a bad parse; there is deliberately no completeness check before the delete, and no test suite for the import path. Correctness currently rests on the preview being read.
