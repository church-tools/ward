-- MIN-1 — ministering schema.
--
-- These four tables already exist in the remote project but were never under
-- migrations, so there is no baseline: this file is deliberately additive and
-- in-place. It is re-runnable by hand in the SQL editor ONLY while the two link
-- tables are empty — the step-0 guard below raises as soon as they hold rows
-- (see supabase/DECISIONS.md — db reset/db diff are unusable here).
--
-- Historical names kept as-is:
--   ministering_area      = companionship
--   member_ministering_in = companionship roster (member -> area)
--   member_ministered_in  = household assignment (household -> area)
--   ministering_district  = ministering district

-- 0. Refuse to run while the tables hold rows: the steps below drop a column
--    and repurpose both link tables, so any existing data must be reviewed
--    (exported or cleared) by the operator first.
do $$
declare
  v_ministered bigint;
  v_ministering bigint;
begin
  select count(*) into v_ministered from public.member_ministered_in;
  select count(*) into v_ministering from public.member_ministering_in;

  if v_ministered > 0 or v_ministering > 0 then
    raise exception
      'MIN-1 aborted: member_ministered_in has % row(s) and member_ministering_in has % row(s). This migration drops member_ministered_in.member and repurposes both tables. Review (export or delete) those rows before proceeding.',
      v_ministered,
      v_ministering
      using hint = 'Empty both tables, or export and reconcile their contents, then re-run this migration.';
  end if;
end
$$;

-- 1. ministering_district: ordering, timestamp, composite FK target.
alter table public.ministering_district
  add column if not exists position integer not null default 0;

alter table public.ministering_district
  add column if not exists updated_at timestamptz default now();

create unique index if not exists ministering_district_id_unit_key
  on public.ministering_district (id, unit);

-- 2. ministering_area: a companionship belongs to a district and carries a name
--    and a display order. No `deleted` column: the app hard-deletes companionships.
alter table public.ministering_area
  add column if not exists district integer;

alter table public.ministering_area
  add column if not exists name text not null default '';

alter table public.ministering_area
  add column if not exists position integer not null default 0;

alter table public.ministering_area
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ministering_area_district_unit_fkey'
      and conrelid = 'public.ministering_area'::regclass
  ) then
    alter table public.ministering_area
      add constraint ministering_area_district_unit_fkey
      foreign key (district, unit)
      references public.ministering_district (id, unit)
      on delete cascade;
  end if;
end
$$;

create index if not exists ministering_area_unit_district_position_idx
  on public.ministering_area (unit, district, position);

comment on table public.ministering_area is
  'COMPANIONSHIP (historical name). A companionship of ministering brothers/sisters; belongs to a ministering_district via (district, unit). Hard-deleted by the app, hence no `deleted` column.';

-- 3. member_ministering_in: the companionship roster (member -> area).
alter table public.member_ministering_in
  add column if not exists position integer not null default 0;

create unique index if not exists member_ministering_in_unit_area_member_key
  on public.member_ministering_in (unit, ministering_area, member)
  where deleted = false;

create index if not exists member_ministering_in_unit_member_idx
  on public.member_ministering_in (unit, member);

comment on table public.member_ministering_in is
  'COMPANIONSHIP ROSTER (historical name): one row per member assigned to a companionship (ministering_area). Uniqueness on (unit, ministering_area, member) applies to live rows only.';

-- 4. member_ministered_in: the household assignment (household -> area).
--    `member` is replaced by `household`; the guard above guarantees the table is empty.
alter table public.member_ministered_in
  drop constraint if exists member_ministered_in_member_unit_fkey;

alter table public.member_ministered_in
  drop column if exists member;

alter table public.member_ministered_in
  add column if not exists household integer;

alter table public.member_ministered_in
  alter column household set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'member_ministered_in_household_unit_fkey'
      and conrelid = 'public.member_ministered_in'::regclass
  ) then
    alter table public.member_ministered_in
      add constraint member_ministered_in_household_unit_fkey
      foreign key (household, unit)
      references public.household (id, unit);
  end if;
end
$$;

-- A household may be ministered to by more than one companionship (an
-- elders-quorum companionship and a relief-society companionship can both be
-- assigned the same household), so a household is unique per companionship, not
-- per unit. The older (unit, household) index would abort such an import.
drop index if exists public.member_ministered_in_unit_household_key;

create unique index if not exists member_ministered_in_unit_area_household_key
  on public.member_ministered_in (unit, ministering_area, household)
  where deleted = false;

create index if not exists member_ministered_in_unit_area_idx
  on public.member_ministered_in (unit, ministering_area);

comment on table public.member_ministered_in is
  'HOUSEHOLD ASSIGNMENT (historical name): one row per household a companionship (ministering_area) is assigned to minister to. The `member` column was replaced by `household` on 2026-10-29 (MIN-1). Uniqueness on (unit, ministering_area, household) applies to live rows only: a household appears at most once per companionship, but may appear under several companionships.';

-- 5. member: supporting lookup for "members of a household".
create index if not exists member_unit_household_idx
  on public.member (unit, household);

comment on column public.member.household is
  'Nullable because the member importer inserts members before households exist; the ministering import backfills a one-member household for any member left without one.';
