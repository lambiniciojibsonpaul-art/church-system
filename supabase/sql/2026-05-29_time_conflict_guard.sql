-- Safe conflict guard for events table (schema-compatible).
-- This version does NOT assume `is_inside` exists.
-- It derives location overlap from:
--   1) exact `setting` match, OR
--   2) exact `latitude` + `longitude` match (when both are present)
--
-- Run this in Supabase SQL editor.

drop trigger if exists trg_events_conflict_guard on public.events;
drop function if exists public.events_conflict_guard();

create or replace function public.events_conflict_guard()
returns trigger
language plpgsql
as $$
declare
  new_start timestamp;
  new_end timestamp;
  has_conflict boolean;
begin
  if coalesce(new.status, 'Active') in ('Cancelled', 'Rejected') then
    return new;
  end if;

  new_start := (new.event_date::text || ' ' || coalesce(new.event_time::text, '00:00'))::timestamp;
  new_end := (coalesce(new.event_end_date, new.event_date)::text || ' ' || coalesce(new.end_time::text, new.event_time::text, '00:00'))::timestamp;

  if new_end <= new_start then
    new_end := new_start + interval '60 minutes';
  end if;

  select exists (
    select 1
    from public.events e
    where e.id <> coalesce(new.id, e.id)
      and coalesce(e.status, 'Active') not in ('Cancelled', 'Rejected')
      and (
        (new.priest_name is not null and e.priest_name = new.priest_name)
        or
        (new.setting is not null and e.setting = new.setting)
        or
        (
          new.latitude is not null and new.longitude is not null
          and e.latitude is not null and e.longitude is not null
          and e.latitude = new.latitude
          and e.longitude = new.longitude
        )
      )
      and (
        (e.event_date::text || ' ' || coalesce(e.event_time::text, '00:00'))::timestamp < new_end
        and
        ((coalesce(e.event_end_date, e.event_date)::text || ' ' || coalesce(e.end_time::text, e.event_time::text, '00:00'))::timestamp) > new_start
      )
  ) into has_conflict;

  if has_conflict then
    raise exception 'EVENT_TIME_CONFLICT';
  end if;

  return new;
end;
$$;

create trigger trg_events_conflict_guard
before insert or update on public.events
for each row
execute function public.events_conflict_guard();

