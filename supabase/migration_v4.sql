-- v4 prelims / finals. Run after migration_v3.sql. Safe to re-run.

alter table public.events add column if not exists round text not null default 'timed_final';
alter table public.events drop constraint if exists events_round_check;
alter table public.events add constraint events_round_check
  check (round in ('prelim', 'final', 'timed_final'));

alter table public.events add column if not exists session text not null default 'unspecified';
alter table public.events drop constraint if exists events_session_check;
alter table public.events add constraint events_session_check
  check (session in ('morning', 'evening', 'unspecified'));

alter table public.events add column if not exists linked_event_id int references public.events(id) on delete set null;
alter table public.events add column if not exists qualify_count int not null default 8;
alter table public.events add column if not exists scores_points boolean not null default true;

update public.events
set scores_points = false
where round = 'prelim';

alter table public.events drop constraint if exists events_meet_day_number_gender_key;
alter table public.events drop constraint if exists events_meet_day_number_gender_round_key;
alter table public.events add constraint events_meet_day_number_gender_round_key
  unique (meet_id, day, event_number, gender, round);
