-- Inter-University Swimming Championships 2026
-- Fresh install: run this file first, then seed.sql, then migration_v2.sql.
-- Existing live databases: do NOT re-run this file. Run supabase/migration_v2.sql only.

create table if not exists public.teams (
  id serial primary key,
  code text unique not null,
  name text not null
);

create table if not exists public.events (
  id serial primary key,
  day int not null,
  event_number int not null,
  name text not null,
  gender text not null check (gender in ('Men', 'Women')),
  event_type text not null check (event_type in ('individual', 'relay')),
  status text not null default 'not_uploaded'
    check (status in ('not_uploaded', 'pending_review', 'confirmed')),
  unique (day, event_number, gender)
);

create table if not exists public.event_results (
  id serial primary key,
  event_id int not null references public.events(id) on delete cascade,
  position int,
  swimmer_name text,
  team_id int not null references public.teams(id),
  achievement text,
  result_status text not null default 'finished'
    check (result_status in ('finished', 'DNS', 'DQ', 'DNF', 'NS', 'WD')),
  points_awarded int not null default 0
);

create table if not exists public.uploads (
  id serial primary key,
  event_id int not null references public.events(id) on delete cascade,
  file_path text not null,
  raw_extraction jsonb,
  uploaded_by text,
  uploaded_at timestamptz not null default now(),
  confirmed boolean not null default false
);

create index if not exists event_results_event_id_idx on public.event_results (event_id);
create index if not exists event_results_team_id_idx on public.event_results (team_id);
create index if not exists uploads_event_id_idx on public.uploads (event_id);

create or replace view public.team_standings
with (security_invoker = true) as
select
  t.id as team_id,
  t.code,
  t.name,
  g.gender,
  coalesce(sum(r.points_awarded), 0)::int as points
from public.teams t
cross join (select unnest(array['Men', 'Women']) as gender) g
left join public.events e on e.gender = g.gender
left join public.event_results r on r.event_id = e.id and r.team_id = t.id
group by t.id, t.code, t.name, g.gender;

create or replace view public.team_overall_standings
with (security_invoker = true) as
select
  t.id as team_id,
  t.code,
  t.name,
  coalesce(sum(r.points_awarded), 0)::int as points
from public.teams t
left join public.event_results r on r.team_id = t.id
group by t.id, t.code, t.name;

-- Atomic replace-not-stack publish
create or replace function public.publish_event_results(
  p_event_id int,
  p_replace boolean,
  p_upload_id int,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.events
  where id = p_event_id
  for update;

  if v_status is null then
    raise exception 'event_not_found';
  end if;

  if v_status = 'confirmed' and not p_replace then
    raise exception 'already_confirmed';
  end if;

  delete from public.event_results where event_id = p_event_id;

  insert into public.event_results (
    event_id, position, swimmer_name, team_id, achievement, result_status, points_awarded
  )
  select
    p_event_id,
    nullif(r->>'position', '')::int,
    r->>'swimmer_name',
    (r->>'team_id')::int,
    r->>'achievement',
    r->>'result_status',
    coalesce((r->>'points_awarded')::int, 0)
  from jsonb_array_elements(p_rows) r;

  update public.events
  set status = 'confirmed'
  where id = p_event_id;

  if p_upload_id is not null then
    update public.uploads
    set confirmed = true
    where id = p_upload_id;
  end if;
end;
$$;

revoke all on function public.publish_event_results(int, boolean, int, jsonb) from public;
grant execute on function public.publish_event_results(int, boolean, int, jsonb) to authenticated;
grant execute on function public.publish_event_results(int, boolean, int, jsonb) to service_role;

alter table public.teams enable row level security;
alter table public.events enable row level security;
alter table public.event_results enable row level security;
alter table public.uploads enable row level security;

drop policy if exists "public read teams" on public.teams;
create policy "public read teams" on public.teams
  for select using (true);

drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events
  for select using (true);

drop policy if exists "admin write events" on public.events;
create policy "admin write events" on public.events
  for all to authenticated
  using (true)
  with check (true);

drop policy if exists "public read results" on public.event_results;
create policy "public read results" on public.event_results
  for select using (true);

drop policy if exists "admin write results" on public.event_results;
create policy "admin write results" on public.event_results
  for all to authenticated
  using (true)
  with check (true);

drop policy if exists "admin read uploads" on public.uploads;
create policy "admin read uploads" on public.uploads
  for select to authenticated
  using (true);

drop policy if exists "admin write uploads" on public.uploads;
create policy "admin write uploads" on public.uploads
  for all to authenticated
  using (true)
  with check (true);

grant select on public.teams, public.events, public.event_results to anon, authenticated;
grant select on public.team_standings, public.team_overall_standings to anon, authenticated;
grant insert, update, delete on public.events, public.event_results, public.uploads to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets (id, name, public)
values ('result-pdfs', 'result-pdfs', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read result PDFs" on storage.objects;
create policy "Public read result PDFs"
  on storage.objects for select
  using (bucket_id = 'result-pdfs');

drop policy if exists "Authenticated upload result PDFs" on storage.objects;
create policy "Authenticated upload result PDFs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'result-pdfs');

drop policy if exists "Authenticated update result PDFs" on storage.objects;
create policy "Authenticated update result PDFs"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'result-pdfs')
  with check (bucket_id = 'result-pdfs');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'event_results'
  ) then
    alter publication supabase_realtime add table public.event_results;
  end if;
end $$;
