-- Blur Chat — forum deletion fix
--
-- Run once in Supabase. Forum posts and every reply beneath them are removed
-- atomically, so replies cannot be orphaned and promoted into new forum cards.
-- The function validates the existing role-based delete rules server-side.

create or replace function public.blur_delete_forum_post(p_message_id bigint)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  root public.messages%rowtype;
  actor_role text;
  target_role text;
begin
  select m.*
    into root
  from public.messages m
  join public.channels c on c.id = m.channel_id
  where m.id = p_message_id
    and c.type = 'forum';

  if root.id is null then
    raise exception 'Forum post not found.';
  end if;

  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select lower(trim(coalesce(role, 'member')))
    into actor_role
  from public.profiles
  where id = auth.uid();

  select lower(trim(coalesce(role, 'member')))
    into target_role
  from public.profiles
  where id = root.user_id;

  -- Authors may remove their own forum. Staff may remove other posts, but
  -- only the owner may remove a post authored by the owner.
  if auth.uid() <> root.user_id and (
    coalesce(actor_role, 'member') not in ('owner', 'admin', 'community_manager', 'moderator')
    or (coalesce(target_role, 'member') = 'owner' and actor_role <> 'owner')
  ) then
    raise exception 'You do not have permission to delete this forum post.';
  end if;

  -- Delete the complete reply tree, not just direct replies. This is safe
  -- with the existing reply_to_id ON DELETE SET NULL relationship because
  -- every descendant is selected before the delete runs.
  with recursive descendants as (
    select id
    from public.messages
    where id = p_message_id
    union all
    select child.id
    from public.messages child
    join descendants parent on child.reply_to_id = parent.id
  )
  delete from public.messages
  where id in (select id from descendants);

  return 1;
end;
$$;

revoke all on function public.blur_delete_forum_post(bigint) from public;
grant execute on function public.blur_delete_forum_post(bigint) to authenticated;
