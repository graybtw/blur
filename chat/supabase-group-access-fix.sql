-- Blur Chat group privacy hardening.
--
-- The original group migration kept the creator in dm_conversations.user_a
-- (and one member in user_b for legacy compatibility). Policies that treated
-- those two columns as sufficient participants therefore let the creator and
-- first invited member keep reading a group after leaving. This migration
-- makes group_members the only access source for group conversations while
-- preserving the existing user_a/user_b behavior for 1:1 DMs.
-- Safe to run more than once.

drop policy if exists "Conversations are viewable by their participants" on public.dm_conversations;
drop policy if exists "Conversations are viewable by participants and group members" on public.dm_conversations;
create policy "Conversations are viewable by participants and group members"
on public.dm_conversations for select to authenticated
using (
  (coalesce(is_group, false) = false and (auth.uid() = user_a or auth.uid() = user_b))
  or (
    coalesce(is_group, false) = true
    and exists (
      select 1 from public.group_members gm
      where gm.conversation_id = id and gm.user_id = auth.uid()
    )
  )
);

drop policy if exists "Participants can update their conversation" on public.dm_conversations;
create policy "Participants can update their conversation"
on public.dm_conversations for update to authenticated
using (
  coalesce(is_group, false) = false
  and (auth.uid() = user_a or auth.uid() = user_b)
)
with check (
  coalesce(is_group, false) = false
  and (auth.uid() = user_a or auth.uid() = user_b)
);

drop policy if exists "Messages are viewable by conversation participants" on public.dm_messages;
drop policy if exists "Messages are viewable by DM participants and group members" on public.dm_messages;
create policy "Messages are viewable by DM participants and group members"
on public.dm_messages for select to authenticated
using (
  exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (
        (coalesce(c.is_group, false) = false and (c.user_a = auth.uid() or c.user_b = auth.uid()))
        or (
          coalesce(c.is_group, false) = true
          and exists (
            select 1 from public.group_members gm
            where gm.conversation_id = c.id and gm.user_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists "Users can send messages as themselves in their conversations" on public.dm_messages;
drop policy if exists "Participants can send messages in DMs and groups" on public.dm_messages;
create policy "Participants can send messages in DMs and groups"
on public.dm_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (
        (coalesce(c.is_group, false) = false and (c.user_a = auth.uid() or c.user_b = auth.uid()))
        or (
          coalesce(c.is_group, false) = true
          and exists (
            select 1 from public.group_members gm
            where gm.conversation_id = c.id and gm.user_id = auth.uid()
          )
        )
      )
  )
);

drop policy if exists "Participants can update their own DM messages" on public.dm_messages;
create policy "Participants can update their own DM messages"
on public.dm_messages for update to authenticated
using (
  sender_id = auth.uid()
  and exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (
        (coalesce(c.is_group, false) = false and (c.user_a = auth.uid() or c.user_b = auth.uid()))
        or (coalesce(c.is_group, false) = true and exists (
          select 1 from public.group_members gm
          where gm.conversation_id = c.id and gm.user_id = auth.uid()
        ))
      )
  )
)
with check (sender_id = auth.uid());

drop policy if exists "Participants can delete their own DM messages" on public.dm_messages;
create policy "Participants can delete their own DM messages"
on public.dm_messages for delete to authenticated
using (
  sender_id = auth.uid()
  and exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (
        (coalesce(c.is_group, false) = false and (c.user_a = auth.uid() or c.user_b = auth.uid()))
        or (coalesce(c.is_group, false) = true and exists (
          select 1 from public.group_members gm
          where gm.conversation_id = c.id and gm.user_id = auth.uid()
        ))
      )
  )
);

drop policy if exists "DM reactions are viewable by participants" on public.dm_message_reactions;
drop policy if exists "DM reactions are viewable by DM and group participants" on public.dm_message_reactions;
create policy "DM reactions are viewable by DM and group participants"
on public.dm_message_reactions for select to authenticated
using (
  exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (
        (coalesce(c.is_group, false) = false and (c.user_a = auth.uid() or c.user_b = auth.uid()))
        or (coalesce(c.is_group, false) = true and exists (
          select 1 from public.group_members gm
          where gm.conversation_id = c.id and gm.user_id = auth.uid()
        ))
      )
  )
);

-- Attachments follow the same membership rules as their DM messages.  In
-- particular, the legacy user_a/user_b columns must not keep granting a
-- former group member access after they leave the group.
drop policy if exists "Authorized users can read chat files" on storage.objects;
create policy "Authorized users can read chat files"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-files'
  and (
    (storage.foldername(storage.objects.name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.messages m
      join public.channels c on c.id = m.channel_id
      where m.attachment_path = storage.objects.name
        and (
          c.visibility = 'public'
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
              and lower(coalesce(p.role, 'member')) in ('owner', 'admin', 'community_manager', 'moderator')
          )
        )
    )
    or exists (
      select 1
      from public.dm_messages dm
      join public.dm_conversations dc on dc.id = dm.conversation_id
      where dm.attachment_path = storage.objects.name
        and (
          (coalesce(dc.is_group, false) = false
            and (dc.user_a = auth.uid() or dc.user_b = auth.uid()))
          or (coalesce(dc.is_group, false) = true and exists (
            select 1 from public.group_members gm
            where gm.conversation_id = dc.id and gm.user_id = auth.uid()
          ))
        )
    )
  )
);

-- Keep the DM list and unread calculation correct when its newest message is
-- deleted.  The original schema only bumped last_message_at on INSERT.
create or replace function public.refresh_dm_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare conversation_key uuid;
begin
  if tg_op = 'DELETE' then
    conversation_key := old.conversation_id;
  else
    conversation_key := new.conversation_id;
  end if;
  update public.dm_conversations c
  set last_message_at = coalesce(
    (select max(m.created_at) from public.dm_messages m where m.conversation_id = conversation_key),
    c.created_at
  )
  where c.id = conversation_key;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists dm_messages_refresh_last_message on public.dm_messages;
create trigger dm_messages_refresh_last_message
after delete on public.dm_messages
for each row execute function public.refresh_dm_conversation_last_message();

drop policy if exists "Participants can add their own DM reactions" on public.dm_message_reactions;
drop policy if exists "Participants can add DM and group reactions" on public.dm_message_reactions;
create policy "Participants can add DM and group reactions"
on public.dm_message_reactions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (
        (coalesce(c.is_group, false) = false and (c.user_a = auth.uid() or c.user_b = auth.uid()))
        or (coalesce(c.is_group, false) = true and exists (
          select 1 from public.group_members gm
          where gm.conversation_id = c.id and gm.user_id = auth.uid()
        ))
      )
  )
);

drop policy if exists "Users can remove their own DM reactions" on public.dm_message_reactions;
create policy "Users can remove their own DM reactions"
on public.dm_message_reactions for delete to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (
        (coalesce(c.is_group, false) = false and (c.user_a = auth.uid() or c.user_b = auth.uid()))
        or (coalesce(c.is_group, false) = true and exists (
          select 1 from public.group_members gm
          where gm.conversation_id = c.id and gm.user_id = auth.uid()
        ))
      )
  )
);
