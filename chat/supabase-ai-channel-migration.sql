-- Blur Chat: shared #ai channel and AI-authored message metadata.
-- Safe to run more than once on an existing project.

alter table public.messages
  add column if not exists is_ai boolean not null default false;

alter table public.messages
  add column if not exists ai_model text;

create index if not exists messages_ai_idx
  on public.messages (is_ai)
  where is_ai = true;

-- Keep this a normal public text channel. Existing rows are preserved.
update public.channels
set type = 'text', visibility = 'public', is_log = false
where lower(name) = 'ai';

insert into public.channels (name, type, visibility, is_log)
select 'ai', 'text', 'public', false
where not exists (
  select 1 from public.channels where lower(name) = 'ai'
);
