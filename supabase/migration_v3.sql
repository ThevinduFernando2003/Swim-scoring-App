-- v3 meet customization, roster check-in, and PDF imports.
-- Safe to re-run after migration_v2.sql. Does not delete results.

alter table public.meets add column if not exists logo_url text;
alter table public.meets add column if not exists primary_color text;
alter table public.meets add column if not exists background_url text;
alter table public.meets add column if not exists next_results_at timestamptz;

alter table public.swimmers add column if not exists age int;
alter table public.swimmers add column if not exists slasu_number text;
alter table public.swimmers add column if not exists registered boolean not null default false;
alter table public.swimmers add column if not exists slasu_verified boolean not null default false;
alter table public.swimmers add column if not exists present boolean not null default false;
alter table public.swimmers add column if not exists notes text;

create table if not exists public.meet_sponsors (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  name text not null,
  logo_url text,
  url text,
  placement text not null default 'footer'
    check (placement in ('footer', 'background', 'header')),
  sort_order int not null default 0
);

create index if not exists meet_sponsors_meet_id_idx on public.meet_sponsors (meet_id);

alter table public.meet_sponsors enable row level security;

drop policy if exists "read sponsors" on public.meet_sponsors;
create policy "read sponsors" on public.meet_sponsors
  for select using (public.meet_is_public(meet_id) or public.can_score_meet(meet_id));

drop policy if exists "write sponsors" on public.meet_sponsors;
create policy "write sponsors" on public.meet_sponsors
  for all to authenticated
  using (public.can_manage_meet(meet_id))
  with check (public.can_manage_meet(meet_id));

grant select on public.meet_sponsors to anon, authenticated;
grant select, insert, update, delete on public.meet_sponsors to authenticated;

insert into storage.buckets (id, name, public)
values ('meet-assets', 'meet-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read meet assets" on storage.objects;
create policy "Public read meet assets"
  on storage.objects for select
  using (bucket_id = 'meet-assets');

drop policy if exists "Authenticated upload meet assets" on storage.objects;
create policy "Authenticated upload meet assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'meet-assets');

drop policy if exists "Authenticated update meet assets" on storage.objects;
create policy "Authenticated update meet assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'meet-assets')
  with check (bucket_id = 'meet-assets');
