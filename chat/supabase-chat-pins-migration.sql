-- Blur Chat 2.0: secure pins for shared-channel messages.
-- Run once in Supabase SQL editor after the existing chat migrations.
drop function if exists public.blur_pin_message(bigint, boolean);
create function public.blur_pin_message(p_message_id bigint, p_pinned boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  result public.messages;
begin
  select lower(coalesce(role, 'member')) into actor_role from public.profiles where id = auth.uid();
  if actor_role not in ('owner','admin','community_manager','moderator') then
    raise exception 'Only staff can pin messages';
  end if;
  update public.messages m
    set is_pinned = p_pinned
    from public.channels c
   where m.id = p_message_id
     and c.id = m.channel_id
     and coalesce(c.is_log, false) = false
   returning m.* into result;
  if result.id is null then raise exception 'Message not found'; end if;
  return to_jsonb(result);
end;
$$;
revoke all on function public.blur_pin_message(bigint, boolean) from public;
grant execute on function public.blur_pin_message(bigint, boolean) to authenticated;
