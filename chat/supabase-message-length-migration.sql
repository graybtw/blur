-- Blur message length cap: 500 characters for shared channels and DMs.
-- NOT VALID preserves any older messages over the new limit while enforcing
-- the cap for every new insert/update.

alter table public.messages
  drop constraint if exists messages_content_max_500;
alter table public.messages
  add constraint messages_content_max_500
  check (char_length(content) between 1 and 500) not valid;

alter table public.dm_messages
  drop constraint if exists dm_messages_content_max_500;
alter table public.dm_messages
  add constraint dm_messages_content_max_500
  check (char_length(content) between 1 and 500) not valid;
