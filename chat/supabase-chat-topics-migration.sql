-- Optional lightweight channel topics used by the Chat 2.0 header.
alter table public.channels add column if not exists topic text;
