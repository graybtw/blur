-- Persist channel mention read markers. Message-level spam blocking was
-- intentionally retired; keep this migration from re-enabling old triggers.
create table if not exists public.channel_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);
alter table public.channel_reads enable row level security;
drop policy if exists "Users manage their channel reads" on public.channel_reads;
create policy "Users manage their channel reads" on public.channel_reads for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists messages_spam_guard on public.messages;
drop function if exists public.prevent_message_spam();
