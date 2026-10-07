-- Blur Chat announcements + owner/community-manager posting
-- Run once against an existing database after supabase-schema.sql.

alter table public.channels
  add column if not exists type text not null default 'text';

alter table public.channels drop constraint if exists channels_type_check;
alter table public.channels
  add constraint channels_type_check check (type in ('text', 'announcement', 'forum'));

update public.channels
set type = 'announcement'
where name = 'announcements';

insert into public.channels (name, type)
values ('updates', 'announcement')
on conflict (name) do update set type = 'announcement';

insert into public.channels (name, type)
values ('sneak-peaks', 'announcement')
on conflict (name) do update set type = 'announcement';

alter table public.profiles
  add column if not exists role text check (char_length(role) <= 24);

drop policy if exists "Users can insert their own messages" on public.messages;
create policy "Users can insert their own messages"
on public.messages for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    not exists (
      select 1 from public.channels c
      where c.id = channel_id and c.type = 'announcement'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('owner', 'community_manager')
    )
  )
);
