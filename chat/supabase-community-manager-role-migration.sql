-- Blur Chat — Community Manager role
-- Run once after the existing roles, moderation, pins, forums, and
-- attachment migrations. This is additive and safe to run again.

begin;

-- Normalize old/malformed values before replacing the accepted-role check.
alter table public.profiles add column if not exists role text;
-- Ensure the normalization below can run from the Supabase SQL editor even
-- if an older deployment still has the original role-protection trigger.
create or replace function public.protect_role_column()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.role := 'member';
    elsif new.role is distinct from old.role then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before insert or update on public.profiles
for each row execute function public.protect_role_column();
update public.profiles
set role = case
  when lower(trim(coalesce(role, ''))) in ('owner','admin','community_manager','moderator','member')
    then lower(trim(role))
  else 'member'
end;
alter table public.profiles alter column role set default 'member';
alter table public.profiles alter column role set not null;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner','admin','community_manager','moderator','member'));

-- Community Managers can use the owner/admin message-length bypass.
alter table public.messages drop constraint if exists messages_content_max_500;
alter table public.messages drop constraint if exists messages_content_check;
alter table public.dm_messages drop constraint if exists dm_messages_content_max_500;
alter table public.dm_messages drop constraint if exists dm_messages_content_check;
create or replace function public.blur_enforce_message_length()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor_role text;
begin
  if new.content is null then raise exception 'Messages cannot be empty.'; end if;
  if btrim(new.content) = '' and new.attachment_path is null and new.attachment_url is null then
    raise exception 'Messages cannot be empty.';
  end if;
  select lower(trim(coalesce(role, 'member'))) into actor_role
  from public.profiles where id = auth.uid();
  if coalesce(actor_role, 'member') not in ('owner','community_manager')
     and char_length(new.content) > 500 then
    raise exception 'Messages are limited to 500 characters.';
  end if;
  return new;
end;
$$;

-- Staff/private-channel visibility and announcement posting.
drop policy if exists "Staff can read moderation logs" on public.moderation_logs;
create policy "Staff can read moderation logs" on public.moderation_logs for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid()
  and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')));

drop policy if exists "Channels are viewable to permitted users" on public.channels;
drop policy if exists "Channels are viewable by authenticated users" on public.channels;
create policy "Channels are viewable to permitted users" on public.channels for select to authenticated
using (visibility = 'public' or exists (select 1 from public.profiles p where p.id = auth.uid()
  and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')));

drop policy if exists "Permitted users can insert messages" on public.messages;
drop policy if exists "Users can insert their own messages" on public.messages;
create policy "Permitted users can insert messages" on public.messages for insert to authenticated
with check (
  auth.uid() = user_id and exists (
    select 1 from public.channels c where c.id = channel_id and c.is_log = false
      and (c.visibility = 'public' or exists (select 1 from public.profiles p where p.id = auth.uid()
        and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')))
      and (coalesce(c.type, 'text') <> 'announcement' or exists (select 1 from public.profiles p where p.id = auth.uid()
        and lower(coalesce(p.role,'')) in ('owner','community_manager')))
  )
);

drop policy if exists "Messages are viewable in permitted channels" on public.messages;
drop policy if exists "Messages are viewable by authenticated users" on public.messages;
create policy "Messages are viewable in permitted channels" on public.messages for select to authenticated
using (exists (select 1 from public.channels c where c.id = channel_id and
  (c.visibility = 'public' or exists (select 1 from public.profiles p where p.id = auth.uid()
    and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')))));

drop policy if exists "Permitted users can delete messages" on public.messages;
create policy "Permitted users can delete messages" on public.messages for delete to authenticated
using (
  auth.uid() = user_id or
  (exists (select 1 from public.profiles actor where actor.id = auth.uid()
     and lower(coalesce(actor.role,'')) in ('owner','admin','community_manager','moderator'))
   and not exists (select 1 from public.profiles target where target.id = messages.user_id
     and lower(coalesce(target.role,'')) = 'owner'))
);

-- Public/staff reaction visibility and inserts.
drop policy if exists "Reactions are viewable in permitted channels" on public.message_reactions;
drop policy if exists "Reactions are viewable by authenticated users" on public.message_reactions;
create policy "Reactions are viewable in permitted channels" on public.message_reactions for select to authenticated
using (exists (select 1 from public.channels c where c.id = channel_id and
  (c.visibility = 'public' or exists (select 1 from public.profiles p where p.id = auth.uid()
    and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')))));
drop policy if exists "Users can react in permitted channels" on public.message_reactions;
drop policy if exists "Users can add their own reactions" on public.message_reactions;
create policy "Users can react in permitted channels" on public.message_reactions for insert to authenticated
with check (auth.uid() = user_id and exists (select 1 from public.channels c where c.id = channel_id and
  (c.visibility = 'public' or exists (select 1 from public.profiles p where p.id = auth.uid()
    and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')))));

-- Keep the existing secure pin RPCs, extending their staff allow-list.
create or replace function public.blur_pin_message(p_message_id bigint, p_pinned boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare actor_role text; result public.messages;
begin
  select lower(coalesce(role, 'member')) into actor_role from public.profiles where id = auth.uid();
  if actor_role not in ('owner','admin','community_manager','moderator') then raise exception 'Only staff can pin messages'; end if;
  update public.messages m set is_pinned = p_pinned
    from public.channels c where m.id = p_message_id and c.id = m.channel_id and coalesce(c.is_log,false)=false
    returning m.* into result;
  if result.id is null then raise exception 'Message not found'; end if;
  return to_jsonb(result);
end;
$$;
revoke all on function public.blur_pin_message(bigint, boolean) from public;
grant execute on function public.blur_pin_message(bigint, boolean) to authenticated;

create or replace function public.blur_pin_forum_post(p_message_id bigint, p_pinned boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare actor_role text; result public.messages;
begin
  select lower(coalesce(role, 'member')) into actor_role from public.profiles where id = auth.uid();
  if actor_role not in ('owner','admin','community_manager') then raise exception 'Only community staff can pin forum posts'; end if;
  update public.messages m set is_pinned = p_pinned from public.channels c
    where m.id = p_message_id and c.id = m.channel_id and c.type = 'forum'
    returning m.* into result;
  if result.id is null then raise exception 'Forum post not found'; end if;
  return to_jsonb(result);
end;
$$;
revoke all on function public.blur_pin_forum_post(bigint, boolean) from public;
grant execute on function public.blur_pin_forum_post(bigint, boolean) to authenticated;

-- Extend server-generated moderation deletion logs to include Community Managers.
create or replace function public.blur_log_deleted_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.channels%rowtype; actor_role text; actor_name text; target_name text;
begin
  select * into c from public.channels where id = old.channel_id;
  select lower(coalesce(role,'member')), coalesce(display_name, username)
    into actor_role, actor_name from public.profiles where id = auth.uid();
  if auth.uid() is null or auth.uid() = old.user_id
     or actor_role not in ('owner','admin','community_manager','moderator') then
    return old;
  end if;
  select coalesce(display_name, username) into target_name
    from public.profiles where id = old.user_id;
  insert into public.moderation_logs(event_type, actor_user_id, target_user_id, channel_id, message_id, content, metadata)
  values ('message_deleted', auth.uid(), old.user_id, old.channel_id, old.id, old.content,
    jsonb_build_object('moderator_username', actor_name, 'author_username', target_name,
      'channel_name', c.name, 'moderator_role', actor_role));
  return old;
end;
$$;

-- Community Managers may remove forum posts under the same owner-protection
-- rule as Admins and Moderators; Owner-authored posts remain Owner-only.
create or replace function public.blur_delete_forum_post(p_message_id bigint)
returns integer language plpgsql security definer set search_path = public as $$
declare root public.messages%rowtype; actor_role text; target_role text;
begin
  select m.* into root
  from public.messages m join public.channels c on c.id=m.channel_id
  where m.id=p_message_id and c.type='forum';
  if root.id is null then raise exception 'Forum post not found.'; end if;
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  select lower(trim(coalesce(role,'member'))) into actor_role
    from public.profiles where id=auth.uid();
  select lower(trim(coalesce(role,'member'))) into target_role
    from public.profiles where id=root.user_id;
  if auth.uid() <> root.user_id and (
    coalesce(actor_role,'member') not in ('owner','admin','community_manager','moderator')
    or (coalesce(target_role,'member')='owner' and actor_role <> 'owner')
  ) then
    raise exception 'You do not have permission to delete this forum post.';
  end if;
  with recursive descendants as (
    select id from public.messages where id=p_message_id
    union all
    select child.id from public.messages child join descendants parent on child.reply_to_id=parent.id
  )
  delete from public.messages where id in (select id from descendants);
  return 1;
end;
$$;
revoke all on function public.blur_delete_forum_post(bigint) from public;
grant execute on function public.blur_delete_forum_post(bigint) to authenticated;

-- Existing attachment policy must allow managers to read staff-channel files.
drop policy if exists "Authorized users can read chat files" on storage.objects;
create policy "Authorized users can read chat files" on storage.objects for select to authenticated
using (bucket_id = 'chat-files' and (
  (storage.foldername(name))[1] = auth.uid()::text
  or exists (select 1 from public.messages m join public.channels c on c.id=m.channel_id
    where m.attachment_path = storage.objects.name and (c.visibility='public' or exists
      (select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'member'))
        in ('owner','admin','community_manager','moderator'))))
  or exists (select 1 from public.dm_messages dm join public.dm_conversations dc on dc.id=dm.conversation_id
      where dm.attachment_path = storage.objects.name and ((coalesce(dc.is_group,false)=false
        and (dc.user_a=auth.uid() or dc.user_b=auth.uid()))
        or (coalesce(dc.is_group,false)=true and exists (select 1 from public.group_members gm
          where gm.conversation_id=dc.id and gm.user_id=auth.uid()))))
));

commit;
