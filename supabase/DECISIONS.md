# Decisions — Database

## 2026-10-29 — A migrations folder without a baseline

`supabase/migrations/` starts with the ministering DDL only. The existing thirty-table schema was created directly in the project and was never under migrations; baselining it needs a `supabase db pull` against the linked project with database credentials, which was deferred rather than blocking this change.

### Consequences

- Only the ministering change is versioned; every other table is still invisible to the migration tooling.
- `supabase db reset` and `supabase db diff` are unusable and destructive — running reset against this history would drop the schema. Do not add either to a script until a baseline exists.
- Applying future migrations by hand in the SQL editor is the status quo; a `db push` only becomes safe once the baseline is captured.
