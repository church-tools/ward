# Decisions — Database

## 2026-10-29 — A migrations folder without a baseline

`supabase/migrations/` starts with the ministering DDL only. The existing thirty-table schema was created directly in the project and was never under migrations; baselining it needs a `supabase db pull` against the linked project with database credentials, which was deferred rather than blocking this change.

### Consequences

- Only the ministering change is versioned; every other table is still invisible to the migration tooling.
- `supabase db reset` and `supabase db diff` are unusable and destructive — running reset against this history would drop the schema. Do not add either to a script until a baseline exists.
- Applying future migrations by hand in the SQL editor is the status quo; a `db push` only becomes safe once the baseline is captured.

## 2026-10-29 — Generated types lag every hand-applied migration

`database.d.ts` is generated, not written: `npm run gen-types` runs `supabase gen types typescript --project-id bfozbjjsbwakbucgdpao` against the linked project, so it only ever reflects what is already deployed remotely. Migrations in this repo — including `20261029000100_ministering.sql` — are applied by hand in the SQL editor, which means the file must be regenerated *after* the migration has been applied and before any code is written against the new shape.

### Consequences

- Until `npm run gen-types` is re-run against a project that has had MIN-1 applied, the generated types still advertise `member_ministered_in.member` and do not know about `household`, `position`, or the new constraints. Code written against them compiles cleanly and fails at runtime.
- Do not hand-edit `database.d.ts` to close that gap; the next `gen-types` (or CI regeneration) would silently discard the edit.
- Order of operations for any future schema change: apply the migration by hand, then regenerate types, then write the code.
