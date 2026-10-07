-- Blur Chat moderation foundation.
-- Safe for existing installations; run after the roles migration.

-- Channel visibility/metadata.
alter table public.channels add column if not exists visibility text not null default 'public';
alter table public.channels add column if not exists is_log boolean not null default false;
update public.channels set visibility = 'public' where visibility is null or visibility not in ('public','staff');
alter table public.channels drop constraint if exists channels_visibility_check;
alter table public.channels add constraint channels_visibility_check check (visibility in ('public','staff'));

update public.channels set visibility = 'staff', is_log = false where name in ('mod-chat','mod-announcements');
update public.channels set visibility = 'staff', is_log = true where name = 'logs';

insert into public.channels (name, type, visibility, is_log)
select 'logs', 'text', 'staff', true where not exists (select 1 from public.channels where name = 'logs');
insert into public.channels (name, type, visibility, is_log)
select 'mod-chat', 'text', 'staff', false where not exists (select 1 from public.channels where name = 'mod-chat');
insert into public.channels (name, type, visibility, is_log)
select 'mod-announcements', 'announcement', 'staff', false where not exists (select 1 from public.channels where name = 'mod-announcements');

-- Message edits.
alter table public.messages add column if not exists edited_at timestamptz;
create index if not exists messages_edited_idx on public.messages (edited_at) where edited_at is not null;

-- Staff-only moderation event feed. There is intentionally no client INSERT policy.
create table if not exists public.moderation_logs (
  id bigserial primary key,
  event_type text not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  channel_id uuid references public.channels(id) on delete set null,
  message_id bigint,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists moderation_logs_created_idx on public.moderation_logs (created_at desc);
create index if not exists moderation_logs_channel_idx on public.moderation_logs (channel_id, created_at);
alter table public.moderation_logs enable row level security;
drop policy if exists "Staff can read moderation logs" on public.moderation_logs;
create policy "Staff can read moderation logs" on public.moderation_logs for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')));

-- Private staff channel access. Members cannot discover staff rows by UUID.
drop policy if exists "Channels are viewable by authenticated users" on public.channels;
drop policy if exists "Channels are viewable to permitted users" on public.channels;
create policy "Channels are viewable to permitted users" on public.channels for select to authenticated
using (visibility = 'public' or exists (select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')));

drop policy if exists "Messages are viewable by authenticated users" on public.messages;
drop policy if exists "Messages are viewable in permitted channels" on public.messages;
create policy "Messages are viewable in permitted channels" on public.messages for select to authenticated
using (exists (select 1 from public.channels c where c.id = channel_id and (c.visibility = 'public' or exists (select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')))));

drop policy if exists "Users can insert their own messages" on public.messages;
drop policy if exists "Permitted users can insert messages" on public.messages;
create policy "Permitted users can insert messages" on public.messages for insert to authenticated
with check (
  auth.uid() = user_id and exists (
    select 1 from public.channels c where c.id = channel_id and c.is_log = false and
      (c.visibility = 'public' or exists (select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator'))) and
      (coalesce(c.type, 'text') <> 'announcement' or exists (select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('owner','community_manager')))
  )
);

drop policy if exists "Users can update their own messages" on public.messages;
create policy "Users can update their own messages" on public.messages for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Permitted users can delete messages" on public.messages;
create policy "Permitted users can delete messages" on public.messages for delete to authenticated
using (
  auth.uid() = user_id or
  (exists (select 1 from public.profiles actor where actor.id = auth.uid() and lower(coalesce(actor.role,'')) in ('owner','admin','community_manager','moderator')) and
   not exists (select 1 from public.profiles target where target.id = messages.user_id and lower(coalesce(target.role,'')) = 'owner'))
);

drop policy if exists "Reactions are viewable by authenticated users" on public.message_reactions;
drop policy if exists "Reactions are viewable in permitted channels" on public.message_reactions;
create policy "Reactions are viewable in permitted channels" on public.message_reactions for select to authenticated
using (exists (select 1 from public.channels c where c.id = channel_id and (c.visibility = 'public' or exists (select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')))));
drop policy if exists "Users can add their own reactions" on public.message_reactions;
drop policy if exists "Users can react in permitted channels" on public.message_reactions;
create policy "Users can react in permitted channels" on public.message_reactions for insert to authenticated
with check (auth.uid() = user_id and exists (select 1 from public.channels c where c.id = channel_id and (c.visibility = 'public' or exists (select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')))));

-- Server-side moderation event logging. DMs and the logs channel never enter this trigger.
create or replace function public.blur_log_message_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.channels%rowtype; actor uuid := auth.uid(); actor_name text; target_name text;
begin
  select * into c from public.channels where id = new.channel_id;
  if c.is_log or c.visibility <> 'public' then return new; end if;
  if lower(regexp_replace(new.content, '[^a-zA-Z0-9]+', ' ', 'g')) ~ '(^| )(fuck|shit|bitch|asshole|cunt|dick|piss)( |$)' then
    select coalesce(display_name, username) into target_name from public.profiles where id = new.user_id;
    insert into public.moderation_logs(event_type, actor_user_id, target_user_id, channel_id, message_id, content, metadata)
    values ('profanity', new.user_id, new.user_id, new.channel_id, new.id, new.content, jsonb_build_object('author_username', target_name, 'channel_name', c.name));
  end if;
  return new;
end;
$$;
drop trigger if exists messages_moderation_log on public.messages;
create trigger messages_moderation_log after insert on public.messages for each row execute function public.blur_log_message_event();

create or replace function public.blur_log_deleted_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.channels%rowtype; actor_role text; actor_name text; target_name text;
begin
  select * into c from public.channels where id = old.channel_id;
  select lower(coalesce(role,'member')), coalesce(display_name, username) into actor_role, actor_name from public.profiles where id = auth.uid();
  if auth.uid() is null or auth.uid() = old.user_id or actor_role not in ('owner','admin','community_manager','moderator') then return old; end if;
  select coalesce(display_name, username) into target_name from public.profiles where id = old.user_id;
  insert into public.moderation_logs(event_type, actor_user_id, target_user_id, channel_id, message_id, content, metadata)
  values ('message_deleted', auth.uid(), old.user_id, old.channel_id, old.id, old.content, jsonb_build_object('moderator_username', actor_name, 'author_username', target_name, 'channel_name', c.name, 'moderator_role', actor_role));
  return old;
end;
$$;
drop trigger if exists messages_moderation_delete_log on public.messages;
create trigger messages_moderation_delete_log after delete on public.messages for each row execute function public.blur_log_deleted_message();

-- Spam blocking has intentionally been retired. Remove any older trigger
-- if this migration is rerun on an installation that previously enabled it.
drop trigger if exists messages_spam_guard on public.messages;
drop function if exists public.prevent_message_spam();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'moderation_logs'
  ) then
    execute 'alter publication supabase_realtime add table public.moderation_logs';
  end if;
end
$$;
alter table public.messages replica identity full;

-- DM parity: participants may edit/delete only their own messages.
alter table public.dm_messages add column if not exists edited_at timestamptz;
drop policy if exists "Participants can update their own DM messages" on public.dm_messages;
create policy "Participants can update their own DM messages" on public.dm_messages for update to authenticated
using (sender_id = auth.uid() and exists (select 1 from public.dm_conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())))
with check (sender_id = auth.uid());
drop policy if exists "Participants can delete their own DM messages" on public.dm_messages;
create policy "Participants can delete their own DM messages" on public.dm_messages for delete to authenticated
using (sender_id = auth.uid() and exists (select 1 from public.dm_conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())));
alter table public.dm_messages replica identity full;
