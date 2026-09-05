-- v6 championship series / yearly editions. Run after migration_v5.sql. Safe to re-run.

create table if not exists public.championships (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  participant_label text not null default 'Team',
  created_at timestamptz not null default now()
);

alter table public.meets add column if not exists championship_id uuid references public.championships(id) on delete set null;
alter table public.meets add column if not exists year int;

alter table public.meet_records add column if not exists championship_id uuid references public.championships(id) on delete set null;

create index if not exists meets_championship_id_idx on public.meets (championship_id);
create index if not exists meet_records_championship_id_idx on public.meet_records (championship_id);

alter table public.championships enable row level security;

drop policy if exists "read championships" on public.championships;
create policy "read championships" on public.championships
  for select using (true);

drop policy if exists "write championships" on public.championships;
create policy "write championships" on public.championships
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.championships to anon, authenticated;
grant select, insert, update, delete on public.championships to authenticated;

insert into public.championships (slug, name, participant_label)
select 'inter-uni', 'Inter University Swimming Championships', 'University'
where not exists (select 1 from public.championships where slug = 'inter-uni');

update public.meets
set
  championship_id = (select id from public.championships where slug = 'inter-uni'),
  year = coalesce(year, 2026)
where slug = 'inter-uni-2026';

update public.meet_records r
set championship_id = m.championship_id
from public.meets m
where r.meet_id = m.id
  and r.championship_id is null
  and m.championship_id is not null;
