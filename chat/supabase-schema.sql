-- =========================================================
-- Blur Chat — Supabase schema
--
-- If you're starting fresh: run this whole file once in the
-- Supabase SQL editor (Dashboard → SQL Editor → New query →
-- paste → Run).
--
-- If you already ran the original version of this file:
-- sections 1–4 will error on things that already exist (that's
-- fine, skip past those errors) — the parts you actually need
-- are sections 5–7 at the bottom, which are safe to run on
-- their own against your existing database.
-- =========================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";


-- =========================================================
-- 1. profiles
--    One row per auth.users row. Created by the app right at
--    signup (see auth.js), so "id" is always a real auth.users id.
-- =========================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null check (char_length(username) between 3 and 24),
  avatar_url  text,
  bio         text check (char_length(bio) <= 160),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any signed-in user can see any profile (needed to show
-- usernames/avatars next to messages).
create policy "Profiles are viewable by authenticated users"
on public.profiles for select
to authenticated
using (true);

-- A user may only ever create their own profile row.
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

-- A user may only edit their own profile row.
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);


-- =========================================================
-- 2. channels
--    Simple list of chat rooms. Read-only from the client —
--    add/rename channels from the Supabase dashboard/SQL for
--    now, that's plenty for a v1.
-- =========================================================

create table public.channels (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  created_at  timestamptz not null default now()
);

alter table public.channels enable row level security;

create policy "Channels are viewable by authenticated users"
on public.channels for select
to authenticated
using (true);

-- Default channels
insert into public.channels (name) values
  ('global'),
  ('gaming'),
  ('movies'),
  ('ai'),
  ('announcements');


-- =========================================================
-- 3. messages
-- =========================================================

create table public.messages (
  id          bigserial primary key,
  channel_id  uuid not null references public.channels(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 2000),
  created_at  timestamptz not null default now()
);

-- Fast "latest 50 messages in this channel" queries
create index messages_channel_created_idx
  on public.messages (channel_id, created_at);

alter table public.messages enable row level security;

create policy "Messages are viewable by authenticated users"
on public.messages for select
to authenticated
using (true);

-- Users can only ever send messages as themselves.
create policy "Users can insert their own messages"
on public.messages for insert
to authenticated
with check (auth.uid() = user_id);

-- No update/delete policies on purpose — editing/deleting
-- messages is a feature for later, not part of this v1.


-- =========================================================
-- 4. Realtime
--    Adds the messages table to Supabase's realtime
--    publication so INSERTs stream to subscribed clients.
-- =========================================================

alter publication supabase_realtime add table public.messages;


-- =========================================================
-- 5. Advanced profile fields
--    Safe to run even on an existing database — "add column
--    if not exists" won't touch data you already have.
-- =========================================================

alter table public.profiles add column if not exists display_name text check (char_length(display_name) <= 32);
alter table public.profiles add column if not exists pronouns text check (char_length(pronouns) <= 40);
alter table public.profiles add column if not exists status_message text check (char_length(status_message) <= 60);
alter table public.profiles add column if not exists accent_color text;


-- =========================================================
-- 6. message_reactions
--    One row per (message, user, emoji). The unique constraint
--    means a user can react with the same emoji only once —
--    clicking it again removes it (a toggle).
-- =========================================================

create table if not exists public.message_reactions (
  id          bigserial primary key,
  message_id  bigint not null references public.messages(id) on delete cascade,
  channel_id  uuid not null references public.channels(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  emoji       text not null check (char_length(emoji) between 1 and 8),
  created_at  timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists message_reactions_channel_idx
  on public.message_reactions (channel_id);

create index if not exists message_reactions_message_idx
  on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

-- Needed so realtime DELETE events include the row's old column
-- values (message_id/emoji/user_id), not just its primary key —
-- the client needs those to know which pill to remove live.
alter table public.message_reactions replica identity full;

drop policy if exists "Reactions are viewable by authenticated users" on public.message_reactions;
create policy "Reactions are viewable by authenticated users"
on public.message_reactions for select
to authenticated
using (true);

drop policy if exists "Users can add their own reactions" on public.message_reactions;
create policy "Users can add their own reactions"
on public.message_reactions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own reactions" on public.message_reactions;
create policy "Users can remove their own reactions"
on public.message_reactions for delete
to authenticated
using (auth.uid() = user_id);


-- =========================================================
-- 7. Realtime for reactions
--    If you get "relation is already member of publication",
--    that just means this line already ran — ignore it.
-- =========================================================

alter publication supabase_realtime add table public.message_reactions;


-- =========================================================
-- 8. Replies
--    Lets a message point at the message it's replying to.
--    ON DELETE SET NULL (not CASCADE) so that if the original
--    message is ever deleted, the reply just loses its quote
--    instead of getting deleted along with it.
-- =========================================================

alter table public.messages
  add column if not exists reply_to_id bigint references public.messages(id) on delete set null;

create index if not exists messages_reply_to_idx
  on public.messages (reply_to_id);


-- =========================================================
-- 9. friendships
--    One row per friend relationship. status starts at
--    'pending' when the requester sends it and flips to
--    'accepted' when the addressee accepts. Declining,
--    cancelling, and unfriending are all just deleting the row.
-- =========================================================

create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','accepted')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id)
);

-- Only one relationship row per pair, no matter who sent it.
create unique index if not exists friendships_unique_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

-- Needed so realtime DELETE events include the row's old
-- column values (requester_id/addressee_id/status), not just
-- its primary key — the client needs those to know whose
-- friend list to update live.
alter table public.friendships replica identity full;

drop policy if exists "Friendships are viewable by the two people in them" on public.friendships;
create policy "Friendships are viewable by the two people in them"
on public.friendships for select
to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can send friend requests as themselves" on public.friendships;
create policy "Users can send friend requests as themselves"
on public.friendships for insert
to authenticated
with check (auth.uid() = requester_id);

-- Only the addressee can update a row, and only to accept it.
drop policy if exists "Addressee can accept a friend request" on public.friendships;
create policy "Addressee can accept a friend request"
on public.friendships for update
to authenticated
using (auth.uid() = addressee_id)
with check (auth.uid() = addressee_id and status = 'accepted');

-- Either side can delete: declining, cancelling, and
-- unfriending are all just removing the row.
drop policy if exists "Either side can delete a friendship" on public.friendships;
create policy "Either side can delete a friendship"
on public.friendships for delete
to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- =========================================================
-- 10. Realtime for friendships
--    If you get "relation is already member of publication",
--    that just means this line already ran — ignore it.
-- =========================================================

alter publication supabase_realtime add table public.friendships;

-- =========================================================
-- 11. dm_conversations
--    One row per pair of users who've DM'd each other. Only
--    creatable between two people who are already friends
--    (enforced below by the insert policy, which checks the
--    friendships table) — there's no cold-DMing strangers.
--
--    user_a/user_b don't mean anything positionally (there's
--    no "requester" here); the unique index just guarantees
--    one row per unordered pair regardless of insert order.
-- =========================================================

create table if not exists public.dm_conversations (
  id                    uuid primary key default gen_random_uuid(),
  user_a                uuid not null references public.profiles(id) on delete cascade,
  user_b                uuid not null references public.profiles(id) on delete cascade,
  created_at            timestamptz not null default now(),
  last_message_at       timestamptz not null default now(),
  user_a_last_read_at   timestamptz not null default now(),
  user_b_last_read_at   timestamptz not null default now(),
  constraint dm_conversations_no_self check (user_a <> user_b)
);

create unique index if not exists dm_conversations_unique_pair_idx
  on public.dm_conversations (least(user_a,user_b), greatest(user_a,user_b));

create index if not exists dm_conversations_user_a_idx on public.dm_conversations (user_a);
create index if not exists dm_conversations_user_b_idx on public.dm_conversations (user_b);

alter table public.dm_conversations enable row level security;

-- Needed so realtime UPDATE/DELETE events include full old
-- column values, same reasoning as message_reactions/friendships above.
alter table public.dm_conversations replica identity full;

drop policy if exists "Conversations are viewable by their participants" on public.dm_conversations;
create policy "Conversations are viewable by their participants"
on public.dm_conversations for select
to authenticated
using (auth.uid() = user_a or auth.uid() = user_b);

-- You can only start a conversation you're a part of, and only
-- with someone you're already friends with.
drop policy if exists "Users can start a conversation with a friend" on public.dm_conversations;
create policy "Users can start a conversation with a friend"
on public.dm_conversations for insert
to authenticated
with check (
  (auth.uid() = user_a or auth.uid() = user_b)
  and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = user_a and f.addressee_id = user_b) or
        (f.requester_id = user_b and f.addressee_id = user_a)
      )
  )
);

-- Either participant can update the row — in practice this is
-- just each side bumping their own *_last_read_at pointer when
-- they open/read the conversation. last_message_at is bumped
-- server-side by the trigger below, not by the client.
drop policy if exists "Participants can update their conversation" on public.dm_conversations;
create policy "Participants can update their conversation"
on public.dm_conversations for update
to authenticated
using (auth.uid() = user_a or auth.uid() = user_b)
with check (auth.uid() = user_a or auth.uid() = user_b);


-- =========================================================
-- 12. dm_messages
-- =========================================================

create table if not exists public.dm_messages (
  id               bigserial primary key,
  conversation_id  uuid not null references public.dm_conversations(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  content          text not null check (char_length(content) between 1 and 2000),
  created_at       timestamptz not null default now()
);

create index if not exists dm_messages_conversation_created_idx
  on public.dm_messages (conversation_id, created_at);

alter table public.dm_messages enable row level security;

drop policy if exists "Messages are viewable by conversation participants" on public.dm_messages;
create policy "Messages are viewable by conversation participants"
on public.dm_messages for select
to authenticated
using (
  exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
  )
);

drop policy if exists "Users can send messages as themselves in their conversations" on public.dm_messages;
create policy "Users can send messages as themselves in their conversations"
on public.dm_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
  )
);

-- No update/delete policies on purpose, same as `messages` above.

-- Keeps dm_conversations.last_message_at (used to sort/show the
-- DM list and to compute unread state) in sync server-side,
-- rather than trusting the client to set it.
create or replace function public.bump_dm_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dm_conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists dm_messages_bump_last_message on public.dm_messages;
create trigger dm_messages_bump_last_message
after insert on public.dm_messages
for each row execute function public.bump_dm_conversation_last_message();


-- =========================================================
-- 13. Realtime for DMs
--    If you get "relation is already member of publication",
--    that just means this line already ran — ignore it.
-- =========================================================

alter publication supabase_realtime add table public.dm_conversations;
alter publication supabase_realtime add table public.dm_messages;