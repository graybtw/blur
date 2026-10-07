-- Secure message reports for shared Chat channels.
-- DMs are intentionally excluded so private conversations never enter
-- moderation logs. Run after the moderation-log migration.

create or replace function public.blur_report_message(p_message_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.messages%rowtype;
  channel_row public.channels%rowtype;
  reporter_role text;
  reporter_name text;
  target_name text;
  existing_id bigint;
  report_id bigint;
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;

  select m.* into target
  from public.messages m
  where m.id = p_message_id;
  select c.* into channel_row
  from public.channels c
  where c.id = target.channel_id;
  if target.id is null or channel_row.id is null or channel_row.is_log then
    raise exception 'That message cannot be reported.';
  end if;

  select lower(trim(coalesce(role, 'member'))), coalesce(display_name, username)
    into reporter_role, reporter_name
  from public.profiles where id = auth.uid();
  if channel_row.visibility = 'staff'
     and coalesce(reporter_role, 'member') not in ('owner','admin','community_manager','moderator') then
    raise exception 'You cannot report a message in this channel.';
  end if;

  -- Avoid flooding Logs when the same user repeatedly clicks Report.
  select id into existing_id
  from public.moderation_logs
  where event_type = 'message_reported'
    and actor_user_id = auth.uid()
    and message_id = target.id
    and created_at > now() - interval '1 hour'
  order by created_at desc
  limit 1;
  if existing_id is not null then
    return jsonb_build_object('duplicate', true, 'id', existing_id);
  end if;

  select coalesce(display_name, username) into target_name
    from public.profiles where id = target.user_id;
  insert into public.moderation_logs(
    event_type, actor_user_id, target_user_id, channel_id, message_id, content, metadata
  ) values (
    'message_reported', auth.uid(), target.user_id, target.channel_id, target.id, target.content,
    jsonb_build_object(
      'reporter_username', reporter_name,
      'author_username', target_name,
      'channel_name', channel_row.name
    )
  ) returning id into report_id;

  return jsonb_build_object('duplicate', false, 'id', report_id);
end;
$$;

revoke all on function public.blur_report_message(bigint) from public;
grant execute on function public.blur_report_message(bigint) to authenticated;
