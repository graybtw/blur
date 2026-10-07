-- Global event controls
-- Run once in the Supabase SQL editor. This keeps the developer panel's
-- Stop Event action authoritative across every connected Blur client.

create or replace function public.stop_global_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  stopped_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select lower(trim(coalesce(role, 'member')))
    into actor_role
  from public.profiles
  where id = auth.uid();

  if coalesce(actor_role, 'member') not in ('owner', 'admin', 'community_manager') then
    raise exception 'Only Blur staff can stop global events';
  end if;

  update public.events
  set ends_at = now() - interval '1 minute'
  where ends_at > now();

  get diagnostics stopped_count = row_count;
  return stopped_count;
end;
$$;

revoke all on function public.stop_global_events() from public;
grant execute on function public.stop_global_events() to authenticated;
