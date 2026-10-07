-- Retire Blur's message spam blocking. This removes both the older
-- moderation trigger and the newer replacement trigger/function.
drop trigger if exists messages_spam_guard on public.messages;
drop function if exists public.prevent_message_spam();
