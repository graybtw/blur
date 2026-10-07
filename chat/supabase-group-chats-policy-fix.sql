-- Fix group creation when dm_conversations RLS cannot see a new group
-- before its first membership row exists.
create or replace function public.blur_is_group_creator(group_id uuid, creator_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dm_conversations c
    where c.id = group_id
      and c.is_group = true
      and c.created_by = creator_id
  );
$$;

revoke all on function public.blur_is_group_creator(uuid, uuid) from public;
grant execute on function public.blur_is_group_creator(uuid, uuid) to authenticated;

drop policy if exists "Group creator can add members" on public.group_members;
create policy "Group creator can add members" on public.group_members
for insert to authenticated
with check (
  public.blur_is_group_creator(conversation_id, auth.uid())
  and (
    user_id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = user_id)
          or (f.requester_id = user_id and f.addressee_id = auth.uid()))
    )
  )
);

drop policy if exists "Group creator can remove members" on public.group_members;
create policy "Group creator can remove members" on public.group_members
for delete to authenticated
using (
  user_id = auth.uid()
  or public.blur_is_group_creator(conversation_id, auth.uid())
);
