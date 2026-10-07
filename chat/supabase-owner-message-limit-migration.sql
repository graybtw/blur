-- Blur Chat — owner message length bypass
--
-- Run this once in Supabase after supabase-message-length-migration.sql.
-- Regular users keep the 500-character limit. The authenticated owner or
-- community manager
-- (profiles.role = 'owner' or 'community_manager') may send longer messages in shared channels and
-- DMs. The check is enforced in a database trigger, so the browser cannot
-- bypass the rule by calling Supabase directly.

-- Remove the older universal 500-character checks. The original schema also
-- shipped with a 2000-character check; remove that as well so the owner can
-- actually bypass the cap. Empty messages are still rejected below.
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
begin
  if new.content is null or btrim(new.content) = '' then
    raise exception 'Messages cannot be empty.';
  end if;

  select lower(trim(coalesce(role, 'member')))
    into actor_role
  from public.profiles
  where id = auth.uid();

  -- Missing, malformed, or non-privileged roles are intentionally treated as
  -- members. auth.uid() keeps this authoritative for browser/API requests.
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
