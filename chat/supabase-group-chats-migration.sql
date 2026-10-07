-- Blur group chats built on the existing dm_conversations/dm_messages tables.

alter table public.dm_conversations add column if not exists is_group boolean not null default false;
alter table public.dm_conversations add column if not exists name text;
alter table public.dm_conversations add column if not exists bio text;
alter table public.dm_conversations add column if not exists created_by uuid references public.profiles(id) on delete set null;
drop index if exists public.dm_conversations_unique_pair_idx;
create unique index if not exists dm_conversations_unique_pair_idx
  on public.dm_conversations (least(user_a,user_b), greatest(user_a,user_b))
  where is_group = false;

create table if not exists public.group_members (
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id);
alter table public.group_members enable row level security;
alter table public.dm_conversations replica identity full;

create or replace function public.blur_is_group_member(group_id uuid, member_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.group_members where conversation_id = group_id and user_id = member_id);
$$;

create or replace function public.blur_is_group_creator(group_id uuid, creator_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.dm_conversations c where c.id = group_id and c.is_group = true and c.created_by = creator_id);
$$;
revoke all on function public.blur_is_group_creator(uuid, uuid) from public;
grant execute on function public.blur_is_group_creator(uuid, uuid) to authenticated;

create or replace function public.blur_update_group_settings(
  p_conversation_id uuid,
  p_name text,
  p_bio text default ''
)
returns public.dm_conversations
language plpgsql
security definer
set search_path = public
as $$
declare result public.dm_conversations;
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  p_name := btrim(coalesce(p_name, ''));
  p_bio := btrim(coalesce(p_bio, ''));
  if p_name = '' then raise exception 'Group name is required.'; end if;
  if char_length(p_name) > 60 then raise exception 'Group names are limited to 60 characters.'; end if;
  if char_length(p_bio) > 160 then raise exception 'Group bios are limited to 160 characters.'; end if;
  update public.dm_conversations
  set name = p_name, bio = p_bio
  where id = p_conversation_id and is_group = true and created_by = auth.uid()
  returning * into result;
  if result.id is null then raise exception 'Only the group creator can edit this group.'; end if;
  return result;
end;
$$;
revoke all on function public.blur_update_group_settings(uuid, text, text) from public;
grant execute on function public.blur_update_group_settings(uuid, text, text) to authenticated;

drop policy if exists "Group members can view membership" on public.group_members;
create policy "Group members can view membership" on public.group_members for select to authenticated
using (public.blur_is_group_member(conversation_id, auth.uid()));
drop policy if exists "Group creator can add members" on public.group_members;
create policy "Group creator can add members" on public.group_members for insert to authenticated
with check (
  public.blur_is_group_creator(conversation_id, auth.uid())
  and (
    user_id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = user_id)
          or (f.requester_id = user_id and f.addressee_id = auth.uid()))
    )
  )
);
drop policy if exists "Members can leave groups" on public.group_members;
create policy "Members can leave groups" on public.group_members for delete to authenticated using (user_id = auth.uid());
drop policy if exists "Group creator can remove members" on public.group_members;
create policy "Group creator can remove members" on public.group_members for delete to authenticated using (
  user_id = auth.uid() or public.blur_is_group_creator(conversation_id, auth.uid())
);
drop policy if exists "Members update own group read state" on public.group_members;
create policy "Members update own group read state" on public.group_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Conversations are viewable by their participants" on public.dm_conversations;
drop policy if exists "Conversations are viewable by participants and group members" on public.dm_conversations;
create policy "Conversations are viewable by participants and group members" on public.dm_conversations for select to authenticated
using (
  (coalesce(is_group,false) = false and (auth.uid() = user_a or auth.uid() = user_b))
  or exists (select 1 from public.group_members gm where gm.conversation_id = id and gm.user_id = auth.uid())
);

drop policy if exists "Group creator can delete group" on public.dm_conversations;
create policy "Group creator can delete group" on public.dm_conversations for delete to authenticated
using (coalesce(is_group,false) = true and created_by = auth.uid() and user_a = auth.uid());

drop policy if exists "Users can start a conversation with a friend" on public.dm_conversations;
drop policy if exists "Users can create conversations and groups" on public.dm_conversations;
create policy "Users can create conversations and groups" on public.dm_conversations for insert to authenticated
with check (
  (is_group = true and created_by = auth.uid() and user_a = auth.uid()) or
  (
    coalesce(is_group,false) = false
    and (auth.uid() = user_a or auth.uid() = user_b)
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = user_a and f.addressee_id = user_b)
          or (f.requester_id = user_b and f.addressee_id = user_a)
        )
    )
  )
);

drop policy if exists "Messages are viewable by conversation participants" on public.dm_messages;
drop policy if exists "Messages are viewable by DM participants and group members" on public.dm_messages;
create policy "Messages are viewable by DM participants and group members" on public.dm_messages for select to authenticated
using (exists (select 1 from public.dm_conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid() or exists (select 1 from public.group_members gm where gm.conversation_id = c.id and gm.user_id = auth.uid()))));

drop policy if exists "Users can send messages as themselves in their conversations" on public.dm_messages;
drop policy if exists "Participants can send messages in DMs and groups" on public.dm_messages;
create policy "Participants can send messages in DMs and groups" on public.dm_messages for insert to authenticated
with check (sender_id = auth.uid() and exists (select 1 from public.dm_conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid() or exists (select 1 from public.group_members gm where gm.conversation_id = c.id and gm.user_id = auth.uid()))));

drop policy if exists "Participants can update their own DM messages" on public.dm_messages;
create policy "Participants can update their own DM messages" on public.dm_messages for update to authenticated
using (sender_id = auth.uid() and exists (select 1 from public.dm_conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid() or exists (select 1 from public.group_members gm where gm.conversation_id = c.id and gm.user_id = auth.uid()))))
with check (sender_id = auth.uid());
drop policy if exists "Participants can delete their own DM messages" on public.dm_messages;
create policy "Participants can delete their own DM messages" on public.dm_messages for delete to authenticated
using (sender_id = auth.uid() and exists (select 1 from public.dm_conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid() or exists (select 1 from public.group_members gm where gm.conversation_id = c.id and gm.user_id = auth.uid()))));

drop policy if exists "DM reactions are viewable by participants" on public.dm_message_reactions;
drop policy if exists "DM reactions are viewable by DM and group participants" on public.dm_message_reactions;
create policy "DM reactions are viewable by DM and group participants" on public.dm_message_reactions for select to authenticated
using (exists (select 1 from public.dm_conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid() or exists (select 1 from public.group_members gm where gm.conversation_id = c.id and gm.user_id = auth.uid()))));
drop policy if exists "Participants can add their own DM reactions" on public.dm_message_reactions;
drop policy if exists "Participants can add DM and group reactions" on public.dm_message_reactions;
create policy "Participants can add DM and group reactions" on public.dm_message_reactions for insert to authenticated
with check (user_id = auth.uid() and exists (select 1 from public.dm_conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid() or exists (select 1 from public.group_members gm where gm.conversation_id = c.id and gm.user_id = auth.uid()))));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_members') then
    execute 'alter publication supabase_realtime add table public.group_members';
  end if;
end
$$;
