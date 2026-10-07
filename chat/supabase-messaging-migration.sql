-- =========================================================
-- Blur Chat — Messaging UX migration (Phase: DM parity)
--
-- Run once in Supabase Dashboard → SQL Editor → New query →
-- paste → Run. Safe to run on the existing database; every
-- statement is idempotent.
--
-- Why these changes exist:
--   1. dm_messages.reply_to_id — DM replies, mirroring the
--      existing messages.reply_to_id column (ON DELETE SET NULL
--      so deleting the original just drops the quote).
--   2. dm_message_reactions — DM emoji reactions, mirroring the
--      existing message_reactions table (same shape, same RLS
--      participant-only rules, same realtime publication).
--
-- NO changes are made to the messages, message_reactions,
-- dm_messages, or dm_conversations rows/policies beyond the one
-- added column. Mentions are stored inside message content as
-- <@user-id> tokens and need no schema support.
-- =========================================================


-- =========================================================
-- 1. DM replies
-- =========================================================

alter table public.dm_messages
  add column if not exists reply_to_id bigint references public.dm_messages(id) on delete set null;

create index if not exists dm_messages_reply_to_idx
  on public.dm_messages (reply_to_id);


-- =========================================================
-- 2. DM reactions
-- =========================================================

create table if not exists public.dm_message_reactions (
  id              bigserial primary key,
  message_id      bigint not null references public.dm_messages(id) on delete cascade,
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  emoji           text not null check (char_length(emoji) between 1 and 8),
  created_at      timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists dm_message_reactions_conversation_idx
  on public.dm_message_reactions (conversation_id);

create index if not exists dm_message_reactions_message_idx
  on public.dm_message_reactions (message_id);

alter table public.dm_message_reactions enable row level security;

-- Needed so realtime DELETE events carry the full old row
-- (message_id/emoji/user_id), same as message_reactions.
alter table public.dm_message_reactions replica identity full;

-- Only the two conversation participants can see reactions.
drop policy if exists "DM reactions are viewable by participants" on public.dm_message_reactions;
create policy "DM reactions are viewable by participants"
on public.dm_message_reactions for select
to authenticated
using (
  exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
  )
);

-- Only participants can react, and only as themselves.
drop policy if exists "Participants can add their own DM reactions" on public.dm_message_reactions;
create policy "Participants can add their own DM reactions"
on public.dm_message_reactions for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
  )
);

-- Only your own reactions can be removed by you (toggle-off).
drop policy if exists "Users can remove their own DM reactions" on public.dm_message_reactions;
create policy "Users can remove their own DM reactions"
on public.dm_message_reactions for delete
to authenticated
using (auth.uid() = user_id);


-- =========================================================
-- 3. Realtime for DM reactions
--    ("relation is already a member of the publication" just
--    means this line already ran — safe to ignore.)
-- =========================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dm_message_reactions'
  ) then
    execute 'alter publication supabase_realtime add table public.dm_message_reactions';
  end if;
end
$$;
