-- Blur Chat integrity hardening.
-- Safe to run after the existing moderation, messaging, forums, and group
-- migrations. It closes mutation paths that cannot be made safe by the UI
-- alone (moving messages between conversations, forging reaction targets,
-- and bypassing the 12-reaction-type limit).

-- Message identity and metadata are immutable from the browser. Users may
-- only change content/edited_at; staff pin RPCs may change is_pinned.
create or replace function public.blur_protect_message_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_role text;
  field text;
begin
  if auth.uid() is null then return new; end if;

  if to_jsonb(new)->>'id' is distinct from to_jsonb(old)->>'id'
     or to_jsonb(new)->>'user_id' is distinct from to_jsonb(old)->>'user_id'
     or to_jsonb(new)->>'sender_id' is distinct from to_jsonb(old)->>'sender_id'
     or to_jsonb(new)->>'channel_id' is distinct from to_jsonb(old)->>'channel_id'
     or to_jsonb(new)->>'conversation_id' is distinct from to_jsonb(old)->>'conversation_id'
     or to_jsonb(new)->>'created_at' is distinct from to_jsonb(old)->>'created_at' then
    raise exception 'Message identity cannot be changed.';
  end if;

  foreach field in array array['reply_to_id','forum_title','attachment_path','attachment_url','attachment_name','attachment_type','attachment_size'] loop
    if (to_jsonb(new)->>field) is distinct from (to_jsonb(old)->>field) then
      raise exception 'Message metadata cannot be changed.';
    end if;
  end loop;

  if (to_jsonb(new)->>'is_pinned') is distinct from (to_jsonb(old)->>'is_pinned') then
    select lower(trim(coalesce(role, 'member'))) into actor_role
    from public.profiles where id = auth.uid();
    if coalesce(actor_role, 'member') not in ('owner','admin','community_manager','moderator') then
      raise exception 'Only staff can pin messages.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_mutation_guard on public.messages;
create trigger messages_mutation_guard
before update on public.messages
for each row execute function public.blur_protect_message_mutation();

drop trigger if exists dm_messages_mutation_guard on public.dm_messages;
create trigger dm_messages_mutation_guard
before update on public.dm_messages
for each row execute function public.blur_protect_message_mutation();

-- Reaction rows must point at a message in the same authorized scope. The
-- advisory transaction lock keeps the distinct-emoji cap correct when two
-- people add a new emoji at the same time.
create or replace function public.blur_validate_channel_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare distinct_count integer;
begin
  if not exists (select 1 from public.messages m where m.id = new.message_id and m.channel_id = new.channel_id) then
    raise exception 'Reaction message/channel mismatch.';
  end if;
  perform pg_advisory_xact_lock(new.message_id);
  select count(distinct emoji) into distinct_count from public.message_reactions where message_id = new.message_id;
  if not exists (select 1 from public.message_reactions r where r.message_id = new.message_id and r.emoji = new.emoji)
     and distinct_count >= 12 then
    raise exception 'A message can have up to 12 different reactions.';
  end if;
  return new;
end;
$$;

drop trigger if exists message_reactions_integrity_guard on public.message_reactions;
create trigger message_reactions_integrity_guard
before insert on public.message_reactions
for each row execute function public.blur_validate_channel_reaction();

create or replace function public.blur_validate_dm_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare distinct_count integer;
begin
  if not exists (select 1 from public.dm_messages m where m.id = new.message_id and m.conversation_id = new.conversation_id) then
    raise exception 'Reaction message/conversation mismatch.';
  end if;
  perform pg_advisory_xact_lock(new.message_id);
  select count(distinct emoji) into distinct_count from public.dm_message_reactions where message_id = new.message_id;
  if not exists (select 1 from public.dm_message_reactions r where r.message_id = new.message_id and r.emoji = new.emoji)
     and distinct_count >= 12 then
    raise exception 'A message can have up to 12 different reactions.';
  end if;
  return new;
end;
$$;

drop trigger if exists dm_message_reactions_integrity_guard on public.dm_message_reactions;
create trigger dm_message_reactions_integrity_guard
before insert on public.dm_message_reactions
for each row execute function public.blur_validate_dm_reaction();

-- Recreate reaction policies with target integrity checks. This also closes
-- the small leak where a user could remove one of their own reaction rows in
-- a conversation they no longer belong to.
drop policy if exists "Reactions are viewable by authenticated users" on public.message_reactions;
drop policy if exists "Reactions are viewable in permitted channels" on public.message_reactions;
create policy "Reactions are viewable in permitted channels"
on public.message_reactions for select to authenticated
using (
  exists (
    select 1 from public.messages m join public.channels c on c.id = m.channel_id
    where m.id = message_id and m.channel_id = message_reactions.channel_id
      and (c.visibility = 'public' or exists (
        select 1 from public.profiles p where p.id = auth.uid()
          and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')
      ))
  )
);

drop policy if exists "Users can add their own reactions" on public.message_reactions;
drop policy if exists "Users can react in permitted channels" on public.message_reactions;
create policy "Users can react in permitted channels"
on public.message_reactions for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.messages m join public.channels c on c.id = m.channel_id
    where m.id = message_id and m.channel_id = message_reactions.channel_id
      and (c.visibility = 'public' or exists (
        select 1 from public.profiles p where p.id = auth.uid()
          and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')
      ))
  )
);

drop policy if exists "Users can remove their own reactions" on public.message_reactions;
create policy "Users can remove their own reactions"
on public.message_reactions for delete to authenticated
using (auth.uid() = user_id and exists (
  select 1 from public.messages m join public.channels c on c.id = m.channel_id
  where m.id = message_id and m.channel_id = message_reactions.channel_id
    and (c.visibility = 'public' or exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and lower(coalesce(p.role,'')) in ('owner','admin','community_manager','moderator')
    ))
));

drop policy if exists "DM reactions are viewable by participants" on public.dm_message_reactions;
drop policy if exists "DM reactions are viewable by DM and group participants" on public.dm_message_reactions;
create policy "DM reactions are viewable by DM and group participants"
on public.dm_message_reactions for select to authenticated
using (exists (
  select 1 from public.dm_messages m join public.dm_conversations c on c.id = m.conversation_id
  where m.id = message_id and m.conversation_id = dm_message_reactions.conversation_id
    and (
      (coalesce(c.is_group,false) = false and (c.user_a = auth.uid() or c.user_b = auth.uid()))
      or (coalesce(c.is_group,false) = true and exists (
        select 1 from public.group_members gm where gm.conversation_id = c.id and gm.user_id = auth.uid()
      ))
    )
));

drop policy if exists "Participants can add their own DM reactions" on public.dm_message_reactions;
drop policy if exists "Participants can add DM and group reactions" on public.dm_message_reactions;
create policy "Participants can add DM and group reactions"
on public.dm_message_reactions for insert to authenticated
with check (auth.uid() = user_id and exists (
  select 1 from public.dm_messages m join public.dm_conversations c on c.id = m.conversation_id
  where m.id = message_id and m.conversation_id = dm_message_reactions.conversation_id
    and (
      (coalesce(c.is_group,false) = false and (c.user_a = auth.uid() or c.user_b = auth.uid()))
      or (coalesce(c.is_group,false) = true and exists (
        select 1 from public.group_members gm where gm.conversation_id = c.id and gm.user_id = auth.uid()
      ))
    )
));

drop policy if exists "Users can remove their own DM reactions" on public.dm_message_reactions;
create policy "Users can remove their own DM reactions"
on public.dm_message_reactions for delete to authenticated
using (auth.uid() = user_id and exists (
  select 1 from public.dm_messages m join public.dm_conversations c on c.id = m.conversation_id
  where m.id = message_id and m.conversation_id = dm_message_reactions.conversation_id
    and (
      (coalesce(c.is_group,false) = false and (c.user_a = auth.uid() or c.user_b = auth.uid()))
      or (coalesce(c.is_group,false) = true and exists (
        select 1 from public.group_members gm where gm.conversation_id = c.id and gm.user_id = auth.uid()
      ))
    )
));

