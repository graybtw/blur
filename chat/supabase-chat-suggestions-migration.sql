-- Rename the shared Chat channel from AI to Suggestions.
-- Existing messages and channel IDs are preserved.
update public.channels
set name = 'suggestions'
where name = 'ai'
  and not exists (select 1 from public.channels where name = 'suggestions');

-- Suggestions is a normal shared text channel, not an announcement channel.
update public.channels
set type = 'text'
where name = 'suggestions';

insert into public.channels (name, type)
select 'suggestions', 'text'
where not exists (select 1 from public.channels where name = 'suggestions');
