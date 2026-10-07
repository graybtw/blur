-- Fix for existing Chat attachment installs.
-- The original read policy used an unqualified `name`, which could resolve
-- to channels.name or dm_conversations.name inside its subqueries. Recreate
-- it with the storage object path explicitly qualified.

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
