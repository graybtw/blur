-- Allow BlurGPT replies to be longer than the normal 500-character chat cap.
-- Run once in Supabase after supabase-ai-channel-migration.sql and the current
-- message-length/attachments migration. User-authored chat messages and DMs
-- remain limited to 500 characters.

alter table public.messages
  add column if not exists is_ai boolean not null default false;

-- Older installs may still have a table-level 500-character check. Remove
-- those checks so the trigger below can apply the exception only to AI rows.
alter table public.messages
  drop constraint if exists messages_content_max_500;
alter table public.messages
  drop constraint if exists messages_content_check;
alter table public.dm_messages
  drop constraint if exists dm_messages_content_max_500;
alter table public.dm_messages
  drop constraint if exists dm_messages_content_check;

create or replace function public.blur_enforce_message_length()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  ai_message boolean := false;
begin
  if new.content is null then
    raise exception 'Messages cannot be empty.';
  end if;
  if btrim(new.content) = '' and new.attachment_path is null and new.attachment_url is null then
    raise exception 'Messages cannot be empty.';
  end if;

  -- Only the messages table has the AI marker; use JSON so this shared
  -- trigger remains valid for dm_messages, which intentionally has no such
  -- column.
  if tg_table_name = 'messages' then
    ai_message := coalesce((to_jsonb(new)->>'is_ai')::boolean, false);
  end if;

  if not ai_message then
    select lower(trim(coalesce(role, 'member')))
      into actor_role
    from public.profiles
    where id = auth.uid();

    if coalesce(actor_role, 'member') not in ('owner', 'community_manager')
       and char_length(new.content) > 500 then
      raise exception 'Messages are limited to 500 characters.';
    end if;
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
