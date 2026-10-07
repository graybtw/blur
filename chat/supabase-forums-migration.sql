-- Forum channel support. Forum posts remain in the shared messages pipeline,
-- with a title and community-staff-controlled pin state.

alter table public.channels drop constraint if exists channels_type_check;
alter table public.channels
  add constraint channels_type_check check (type in ('text', 'announcement', 'forum'));

alter table public.messages add column if not exists forum_title text;
alter table public.messages add column if not exists is_pinned boolean not null default false;
alter table public.messages add column if not exists forum_post_id bigint references public.messages(id) on delete cascade;
alter table public.messages drop constraint if exists messages_forum_title_check;
alter table public.messages add constraint messages_forum_title_check
  check (forum_title is null or char_length(forum_title) between 1 and 120) not valid;
create index if not exists messages_forum_pinned_idx
  on public.messages (channel_id, is_pinned, created_at);
create index if not exists messages_forum_post_idx
  on public.messages (forum_post_id, created_at);

insert into public.channels (name, type, visibility, is_log)
values ('suggestions', 'forum', 'public', false)
on conflict (name) do update
  set type = 'forum', visibility = 'public', is_log = false;

-- Suggestions' old flat-channel messages do not have forum titles. Remove
-- only those legacy rows so the new forum opens as a clean post grid.
delete from public.messages
where channel_id = (select id from public.channels where name = 'suggestions')
  and forum_title is null
  and reply_to_id is null;

drop function if exists public.blur_pin_forum_post(bigint, boolean);
create function public.blur_pin_forum_post(p_message_id bigint, p_pinned boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result public.messages;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) in ('owner', 'admin', 'community_manager')
  ) then
    raise exception 'Only community staff can pin forum posts';
  end if;
  update public.messages m
  set is_pinned = p_pinned
  from public.channels c
  where m.id = p_message_id and c.id = m.channel_id and c.type = 'forum'
  returning m.* into result;
  if result.id is null then raise exception 'Forum post not found'; end if;
  return to_jsonb(result);
end;
$$;
revoke all on function public.blur_pin_forum_post(bigint, boolean) from public;
grant execute on function public.blur_pin_forum_post(bigint, boolean) to authenticated;
