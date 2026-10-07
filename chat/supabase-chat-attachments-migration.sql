-- Blur Chat attachments + GIF-ready messages.
-- Run once in Supabase after the existing group-chat migration (the private
-- file policy checks group membership). This migration is additive and safe
-- to rerun.

-- Message descriptors. The actual bytes stay in private Storage.
alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_url text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists attachment_type text;
alter table public.messages add column if not exists attachment_size bigint;

alter table public.dm_messages add column if not exists attachment_path text;
alter table public.dm_messages add column if not exists attachment_url text;
alter table public.dm_messages add column if not exists attachment_name text;
alter table public.dm_messages add column if not exists attachment_type text;
alter table public.dm_messages add column if not exists attachment_size bigint;

create index if not exists messages_attachment_path_idx
  on public.messages (attachment_path) where attachment_path is not null;
create index if not exists dm_messages_attachment_path_idx
  on public.dm_messages (attachment_path) where attachment_path is not null;

-- Owner message-length migration originally kept an unconditional non-empty
-- check. Replace it so a file-only message is valid while the normal 500-char
-- limit remains authoritative for every non-owner/community-manager role.
alter table public.messages drop constraint if exists messages_content_max_500;
alter table public.messages drop constraint if exists messages_content_check;
alter table public.dm_messages drop constraint if exists dm_messages_content_max_500;
alter table public.dm_messages drop constraint if exists dm_messages_content_check;

create or replace function public.blur_enforce_message_length()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_role text;
begin
  if new.content is null then
    raise exception 'Messages cannot be empty.';
  end if;
  if btrim(new.content) = '' and new.attachment_path is null and new.attachment_url is null then
    raise exception 'Messages cannot be empty.';
  end if;

  select lower(trim(coalesce(role, 'member')))
    into actor_role
  from public.profiles
  where id = auth.uid();

  if coalesce(actor_role, 'member') not in ('owner','community_manager')
     and char_length(new.content) > 500 then
    raise exception 'Messages are limited to 500 characters.';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_length_guard on public.messages;
create trigger messages_length_guard
before insert or update of content on public.messages
for each row execute function public.blur_enforce_message_length();

drop trigger if exists dm_messages_length_guard on public.dm_messages;
create trigger dm_messages_length_guard
before insert or update of content on public.dm_messages
for each row execute function public.blur_enforce_message_length();

-- Private bucket: clients receive short-lived signed URLs only after the
-- database confirms that they can see the associated message/conversation.
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-files', 'chat-files', false, 10485760)
on conflict (id) do update
  set public = false, file_size_limit = 10485760;

drop policy if exists "Users can upload chat files" on storage.objects;
create policy "Users can upload chat files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authorized users can read chat files" on storage.objects;
create policy "Authorized users can read chat files"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-files'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
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

drop policy if exists "Users can update chat files they uploaded" on storage.objects;
create policy "Users can update chat files they uploaded"
on storage.objects for update to authenticated
using (bucket_id = 'chat-files' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'chat-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete chat files they uploaded" on storage.objects;
create policy "Users can delete chat files they uploaded"
on storage.objects for delete to authenticated
using (bucket_id = 'chat-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- A staff-only testing channel. Channels.fetchAll already places staff rows
-- in the existing Staff section and the current channel policies protect it.
insert into public.channels (name, type, visibility, is_log)
values ('testing', 'text', 'staff', false)
on conflict (name) do update
  set type = 'text', visibility = 'staff', is_log = false;
