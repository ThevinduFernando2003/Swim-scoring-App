-- v2 multi-meet migration. Run in the Supabase SQL editor AFTER schema.sql + seed.sql
-- (safe on a live database: backfills Inter Uni as meet #1, no result rows deleted).
-- Safe to re-run if a previous attempt failed at the standings views.

create table if not exists public.meets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  participant_label text not null default 'Team',
  status text not null default 'draft'
    check (status in ('draft', 'live', 'completed')),
  points_config jsonb not null default '{
    "max_places": 6,
    "individual": {"1":7,"2":5,"3":4,"4":3,"5":2,"6":1},
    "relay": {"1":10,"2":7,"3":5,"4":3,"5":2,"6":1}
  }'::jsonb,
  pdfs_public boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Swim Scoring',
  logo_url text,
  primary_color text not null default '#d4af37',
  footer_text text not null default 'Live swimming championship scoring'
);

insert into public.organization_settings (id, name, footer_text)
values (1, 'Swim Scoring', 'Live swimming championship scoring')
on conflict (id) do nothing;

insert into public.meets (slug, name, participant_label, status, points_config)
values (
  'inter-uni-2026',
  'Inter University Swimming Championships 2026',
  'University',
  'live',
  '{
    "max_places": 6,
    "individual": {"1":7,"2":5,"3":4,"4":3,"5":2,"6":1},
    "relay": {"1":10,"2":7,"3":5,"4":3,"5":2,"6":1}
  }'::jsonb
)
on conflict (slug) do nothing;

alter table public.teams add column if not exists meet_id uuid references public.meets(id);
alter table public.events add column if not exists meet_id uuid references public.meets(id);
alter table public.uploads add column if not exists meet_id uuid references public.meets(id);

update public.teams t
set meet_id = m.id
from public.meets m
where m.slug = 'inter-uni-2026' and t.meet_id is null;

update public.events e
set meet_id = m.id
from public.meets m
where m.slug = 'inter-uni-2026' and e.meet_id is null;

update public.uploads u
set meet_id = e.meet_id
from public.events e
where u.event_id = e.id and u.meet_id is null;

alter table public.teams alter column meet_id set not null;
alter table public.events alter column meet_id set not null;

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.teams'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%(code)%'
      and conname <> 'teams_meet_id_code_key'
  loop
    execute format('alter table public.teams drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.teams drop constraint if exists teams_meet_id_code_key;
alter table public.teams add constraint teams_meet_id_code_key unique (meet_id, code);

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.events'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%(day, event_number, gender)%'
      and conname <> 'events_meet_day_number_gender_key'
  loop
    execute format('alter table public.events drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.events drop constraint if exists events_meet_day_number_gender_key;
alter table public.events add constraint events_meet_day_number_gender_key
  unique (meet_id, day, event_number, gender);

alter table public.events drop constraint if exists events_gender_check;
alter table public.events add constraint events_gender_check
  check (gender in ('Men', 'Women', 'Boys', 'Girls', 'Mixed'));

create table if not exists public.swimmers (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  team_id int not null references public.teams(id) on delete cascade,
  name text not null,
  gender text,
  age_group text,
  unique (meet_id, team_id, name)
);

alter table public.event_results add column if not exists swimmer_id uuid references public.swimmers(id);

create table if not exists public.meet_roles (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('meet_admin', 'official')),
  unique (meet_id, user_id)
);

create table if not exists public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

insert into public.super_admins (user_id)
select id from auth.users where lower(email) = 'admin@gmail.com'
on conflict do nothing;

create index if not exists teams_meet_id_idx on public.teams (meet_id);
create index if not exists events_meet_id_idx on public.events (meet_id);
create index if not exists swimmers_meet_id_idx on public.swimmers (meet_id);
create index if not exists event_results_swimmer_id_idx on public.event_results (swimmer_id);
create index if not exists meet_roles_user_id_idx on public.meet_roles (user_id);

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.super_admins where user_id = auth.uid())
    or (auth.uid() is not null and not exists (select 1 from public.super_admins));
$$;

create or replace function public.can_manage_meet(p_meet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1 from public.meet_roles
      where meet_id = p_meet_id and user_id = auth.uid() and role = 'meet_admin'
    );
$$;

create or replace function public.can_score_meet(p_meet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1 from public.meet_roles
      where meet_id = p_meet_id and user_id = auth.uid()
    );
$$;

create or replace function public.meet_is_public(p_meet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.meets where id = p_meet_id and status <> 'draft'
  );
$$;

grant execute on function public.is_super_admin() to anon, authenticated;
grant execute on function public.can_manage_meet(uuid) to anon, authenticated;
grant execute on function public.can_score_meet(uuid) to anon, authenticated;
grant execute on function public.meet_is_public(uuid) to anon, authenticated;

-- CREATE OR REPLACE VIEW cannot rename columns. The v1 views start with team_id;
-- v2 prepends meet_id, so they must be dropped and recreated.
drop view if exists public.swimmer_standings;
drop view if exists public.team_standings;
drop view if exists public.team_overall_standings;

create view public.team_standings
with (security_invoker = true) as
select
  t.meet_id,
  t.id as team_id,
  t.code,
  t.name,
  g.gender,
  coalesce(sum(r.points_awarded), 0)::int as points
from public.teams t
cross join (select unnest(array['Men', 'Women', 'Boys', 'Girls', 'Mixed']) as gender) g
left join public.events e on e.meet_id = t.meet_id and e.gender = g.gender
left join public.event_results r on r.event_id = e.id and r.team_id = t.id
group by t.meet_id, t.id, t.code, t.name, g.gender;

create view public.team_overall_standings
with (security_invoker = true) as
select
  t.meet_id,
  t.id as team_id,
  t.code,
  t.name,
  coalesce(sum(r.points_awarded), 0)::int as points
from public.teams t
left join public.event_results r on r.team_id = t.id
group by t.meet_id, t.id, t.code, t.name;

create view public.swimmer_standings
with (security_invoker = true) as
select
  s.meet_id,
  s.id as swimmer_id,
  s.name,
  s.team_id,
  t.code as team_code,
  t.name as team_name,
  coalesce(sum(r.points_awarded), 0)::int as points,
  count(r.id)::int as events_entered
from public.swimmers s
join public.teams t on t.id = s.team_id
left join public.event_results r on r.swimmer_id = s.id
group by s.meet_id, s.id, s.name, s.team_id, t.code, t.name;

grant select on public.team_standings, public.team_overall_standings,
  public.swimmer_standings to anon, authenticated;

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
  v_meet uuid;
begin
  select e.status, e.meet_id into v_status, v_meet
  from public.events e
  where e.id = p_event_id
  for update;

  if v_status is null then
    raise exception 'event_not_found';
  end if;

  if not public.can_score_meet(v_meet) then
    raise exception 'forbidden';
  end if;

  if v_status = 'confirmed' and not p_replace then
    raise exception 'already_confirmed';
  end if;

  delete from public.event_results where event_id = p_event_id;

  insert into public.event_results (
    event_id, position, swimmer_name, team_id, achievement, result_status, points_awarded, swimmer_id
  )
  select
    p_event_id,
    nullif(r->>'position', '')::int,
    r->>'swimmer_name',
    (r->>'team_id')::int,
    r->>'achievement',
    r->>'result_status',
    coalesce((r->>'points_awarded')::int, 0),
    nullif(r->>'swimmer_id', '')::uuid
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

create or replace function public.mark_event_pending_review(p_event_id int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meet uuid;
  v_status text;
begin
  select meet_id, status into v_meet, v_status
  from public.events
  where id = p_event_id;

  if v_meet is null then
    raise exception 'event_not_found';
  end if;
  if not public.can_score_meet(v_meet) then
    raise exception 'forbidden';
  end if;
  if v_status is distinct from 'confirmed' then
    update public.events set status = 'pending_review' where id = p_event_id;
  end if;
end;
$$;

revoke all on function public.publish_event_results(int, boolean, int, jsonb) from public;
grant execute on function public.publish_event_results(int, boolean, int, jsonb) to authenticated;
grant execute on function public.publish_event_results(int, boolean, int, jsonb) to service_role;
grant execute on function public.mark_event_pending_review(int) to authenticated;

alter table public.meets enable row level security;
alter table public.swimmers enable row level security;
alter table public.meet_roles enable row level security;
alter table public.super_admins enable row level security;
alter table public.organization_settings enable row level security;

drop policy if exists "read meets" on public.meets;
create policy "read meets" on public.meets
  for select using (status <> 'draft' or public.is_super_admin() or public.can_score_meet(id));

drop policy if exists "write meets" on public.meets;
create policy "write meets" on public.meets
  for all to authenticated
  using (public.is_super_admin() or public.can_manage_meet(id))
  with check (public.is_super_admin() or public.can_manage_meet(id));

drop policy if exists "insert meets" on public.meets;
-- covered by write meets for super admin; insert of new meets:
drop policy if exists "insert new meets" on public.meets;
create policy "insert new meets" on public.meets
  for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists "public read teams" on public.teams;
create policy "public read teams" on public.teams
  for select using (public.meet_is_public(meet_id) or public.can_score_meet(meet_id));

drop policy if exists "admin write teams" on public.teams;
drop policy if exists "manage teams" on public.teams;
create policy "manage teams" on public.teams
  for all to authenticated
  using (public.can_manage_meet(meet_id))
  with check (public.can_manage_meet(meet_id));

drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events
  for select using (public.meet_is_public(meet_id) or public.can_score_meet(meet_id));

drop policy if exists "admin write events" on public.events;
drop policy if exists "manage events" on public.events;
create policy "manage events" on public.events
  for all to authenticated
  using (public.can_manage_meet(meet_id))
  with check (public.can_manage_meet(meet_id));

drop policy if exists "public read results" on public.event_results;
create policy "public read results" on public.event_results
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (public.meet_is_public(e.meet_id) or public.can_score_meet(e.meet_id))
    )
  );

drop policy if exists "admin write results" on public.event_results;
drop policy if exists "score results" on public.event_results;
create policy "score results" on public.event_results
  for all to authenticated
  using (
    exists (select 1 from public.events e where e.id = event_id and public.can_score_meet(e.meet_id))
  )
  with check (
    exists (select 1 from public.events e where e.id = event_id and public.can_score_meet(e.meet_id))
  );

drop policy if exists "admin read uploads" on public.uploads;
drop policy if exists "admin write uploads" on public.uploads;
drop policy if exists "read uploads" on public.uploads;
create policy "read uploads" on public.uploads
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (
          (public.meet_is_public(e.meet_id) and confirmed = true)
          or public.can_score_meet(e.meet_id)
        )
    )
  );

drop policy if exists "write uploads" on public.uploads;
create policy "write uploads" on public.uploads
  for all to authenticated
  using (
    exists (select 1 from public.events e where e.id = event_id and public.can_score_meet(e.meet_id))
  )
  with check (
    exists (select 1 from public.events e where e.id = event_id and public.can_score_meet(e.meet_id))
  );

drop policy if exists "read swimmers" on public.swimmers;
create policy "read swimmers" on public.swimmers
  for select using (public.meet_is_public(meet_id) or public.can_score_meet(meet_id));

drop policy if exists "write swimmers" on public.swimmers;
create policy "write swimmers" on public.swimmers
  for all to authenticated
  using (public.can_score_meet(meet_id))
  with check (public.can_score_meet(meet_id));

drop policy if exists "read meet roles" on public.meet_roles;
create policy "read meet roles" on public.meet_roles
  for select to authenticated
  using (public.is_super_admin() or public.can_manage_meet(meet_id) or user_id = auth.uid());

drop policy if exists "write meet roles" on public.meet_roles;
create policy "write meet roles" on public.meet_roles
  for all to authenticated
  using (public.is_super_admin() or public.can_manage_meet(meet_id))
  with check (public.is_super_admin() or public.can_manage_meet(meet_id));

drop policy if exists "read super admins" on public.super_admins;
create policy "read super admins" on public.super_admins
  for select to authenticated
  using (public.is_super_admin() or user_id = auth.uid());

drop policy if exists "write super admins" on public.super_admins;
create policy "write super admins" on public.super_admins
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "read org settings" on public.organization_settings;
create policy "read org settings" on public.organization_settings
  for select using (true);

drop policy if exists "write org settings" on public.organization_settings;
create policy "write org settings" on public.organization_settings
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.meets, public.swimmers, public.organization_settings to anon, authenticated;
grant select on public.swimmer_standings to anon, authenticated;
grant select, insert, update, delete on public.meets, public.teams, public.events,
  public.event_results, public.uploads, public.swimmers, public.meet_roles to authenticated;
grant select, insert, update, delete on public.super_admins, public.organization_settings to authenticated;

insert into public.meet_roles (meet_id, user_id, role)
select m.id, u.id, 'meet_admin'
from public.meets m
join auth.users u on lower(u.email) = 'admin@gmail.com'
where m.slug = 'inter-uni-2026'
on conflict (meet_id, user_id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'meets'
  ) then
    alter publication supabase_realtime add table public.meets;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'swimmers'
  ) then
    alter publication supabase_realtime add table public.swimmers;
  end if;
end $$;
