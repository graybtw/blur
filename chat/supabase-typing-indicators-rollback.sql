-- Run only if supabase-typing-indicators-migration.sql was already applied.
-- Removes only the private typing-signal policies and helper function.

drop policy if exists "Chat members can receive typing signals" on realtime.messages;
drop policy if exists "Chat members can send their own typing signals" on realtime.messages;
drop function if exists public.blur_can_access_typing_topic(text);
