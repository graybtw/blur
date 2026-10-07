-- Blur analytics -----------------------------------------------------------
-- Run this once in the Supabase SQL editor. The client only records a random
-- browser/session id, tab name, auth state, and timestamps; it never stores
-- URLs, message content, or user agents.

create table if not exists public.blur_analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in ('visit', 'tab_view', 'heartbeat')),
  tab text not null default 'home',
  visitor_id text not null,
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  is_authenticated boolean not null default false,
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 86400)
);

-- Keep this migration safe for projects that created the first version of
-- the table before heartbeats/session duration were added.
alter table public.blur_analytics_events
  drop constraint if exists blur_analytics_events_event_type_check;
alter table public.blur_analytics_events
  add constraint blur_analytics_events_event_type_check
  check (event_type in ('visit', 'tab_view', 'heartbeat'));
alter table public.blur_analytics_events
  add column if not exists duration_seconds integer not null default 0;
alter table public.blur_analytics_events
  drop constraint if exists blur_analytics_events_duration_seconds_check;
alter table public.blur_analytics_events
  add constraint blur_analytics_events_duration_seconds_check
  check (duration_seconds between 0 and 86400);

create index if not exists blur_analytics_events_created_at_idx
  on public.blur_analytics_events (created_at desc);
create index if not exists blur_analytics_events_event_type_idx
  on public.blur_analytics_events (event_type, created_at desc);
create index if not exists blur_analytics_events_tab_idx
  on public.blur_analytics_events (tab, created_at desc);
create index if not exists blur_analytics_events_session_idx
  on public.blur_analytics_events (session_id, created_at desc);

alter table public.blur_analytics_events enable row level security;

drop policy if exists "Anyone can record Blur analytics" on public.blur_analytics_events;
create policy "Anyone can record Blur analytics"
  on public.blur_analytics_events
  for insert
  to anon, authenticated
  with check (
    char_length(visitor_id) between 8 and 160
    and char_length(session_id) between 8 and 160
    and char_length(tab) between 1 and 80
    and duration_seconds between 0 and 86400
    and (
      (user_id is null and is_authenticated = false)
      or (user_id = auth.uid() and is_authenticated = true)
    )
  );

create or replace function public.blur_dev_analytics_summary(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  since_at timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  result jsonb;
begin
  select jsonb_build_object(
    'days', greatest(1, least(coalesce(p_days, 30), 365)),
    'visits', count(*) filter (where event_type = 'visit'),
    'visitors', count(distinct visitor_id) filter (where event_type = 'visit'),
    'account_visitors', count(distinct visitor_id) filter (where event_type = 'visit' and is_authenticated),
    'guest_visitors', count(distinct visitor_id) filter (where event_type = 'visit' and not is_authenticated),
    'sessions', count(distinct session_id) filter (where event_type = 'visit'),
    'returning_visitors', coalesce((
      select count(*) from (
        select visitor_id
        from public.blur_analytics_events
        where created_at >= since_at and event_type = 'visit'
        group by visitor_id
        having count(distinct session_id) > 1
      ) returning_rows
    ), 0),
    'avg_session_seconds', coalesce((
      select round(avg(session_seconds))::integer from (
        select session_id, max(duration_seconds)::numeric as session_seconds
        from public.blur_analytics_events
        where created_at >= since_at
        group by session_id
      ) session_lengths
    ), 0),
    'last_24h_visits', (
      select count(*) from public.blur_analytics_events
      where created_at >= greatest(since_at, now() - interval '24 hours')
        and event_type = 'visit'
    ),
    'last_24h_visitors', (
      select count(distinct visitor_id) from public.blur_analytics_events
      where created_at >= greatest(since_at, now() - interval '24 hours')
        and event_type = 'visit'
    ),
    'tabs', coalesce((
      select jsonb_agg(jsonb_build_object('tab', tab, 'views', views, 'visitors', visitors) order by views desc)
      from (
        select tab, count(*)::integer as views, count(distinct visitor_id)::integer as visitors
        from public.blur_analytics_events
        where created_at >= since_at and event_type = 'tab_view'
        group by tab
        order by views desc
        limit 8
      ) ranked_tabs
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'visits', visits, 'visitors', visitors, 'sessions', sessions) order by day)
      from (
        select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day,
               count(*)::integer as visits
               , count(distinct visitor_id)::integer as visitors
               , count(distinct session_id)::integer as sessions
        from public.blur_analytics_events
        where created_at >= since_at and event_type = 'visit'
        group by day
        order by day desc
        limit 30
      ) daily_visits
    ), '[]'::jsonb)
  ) into result
  from public.blur_analytics_events
  where created_at >= since_at;

  return coalesce(result, '{}'::jsonb);
end;
$$;

grant execute on function public.blur_dev_analytics_summary(integer) to anon, authenticated;
