-- v5 meet records and NMR flags. Run after migration_v4.sql. Safe to re-run.

alter table public.event_results add column if not exists record_flag text;
alter table public.event_results drop constraint if exists event_results_record_flag_check;
alter table public.event_results add constraint event_results_record_flag_check
  check (record_flag is null or record_flag in ('NMR'));

create table if not exists public.meet_records (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  event_key text not null,
  event_name text not null,
  gender text not null,
  event_type text not null,
  time_text text not null,
  time_ms int not null,
  swimmer_name text not null,
  team_code text,
  year int,
  is_current boolean not null default true,
  set_at_event_id int references public.events(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists meet_records_meet_id_idx on public.meet_records (meet_id);
create index if not exists meet_records_event_key_idx on public.meet_records (meet_id, event_key, is_current);

alter table public.meet_records enable row level security;

drop policy if exists "read meet records" on public.meet_records;
create policy "read meet records" on public.meet_records
  for select using (public.meet_is_public(meet_id) or public.can_score_meet(meet_id));

drop policy if exists "write meet records" on public.meet_records;
create policy "write meet records" on public.meet_records
  for all to authenticated
  using (public.can_score_meet(meet_id))
  with check (public.can_score_meet(meet_id));

grant select on public.meet_records to anon, authenticated;
grant select, insert, update, delete on public.meet_records to authenticated;

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
    event_id, position, swimmer_name, team_id, achievement, result_status,
    points_awarded, swimmer_id, record_flag
  )
  select
    p_event_id,
    nullif(r->>'position', '')::int,
    r->>'swimmer_name',
    (r->>'team_id')::int,
    r->>'achievement',
    r->>'result_status',
    coalesce((r->>'points_awarded')::int, 0),
    nullif(r->>'swimmer_id', '')::uuid,
    nullif(r->>'record_flag', '')
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
