-- Blur group settings + creator member management.
-- Run after the existing group-chat migrations. Additive and safe to rerun.

-- Only the group creator can edit its name/bio. The RPC avoids exposing a
-- broad update policy on dm_conversations to ordinary participants.
create or replace function public.blur_update_group_settings(
  p_conversation_id uuid,
  p_name text,
  p_bio text default ''
)
returns public.dm_conversations
language plpgsql
security definer
set search_path = public
as $$
declare result public.dm_conversations;
begin
  if auth.uid() is null then raise exception 'You must be signed in.'; end if;
  p_name := btrim(coalesce(p_name, ''));
  p_bio := btrim(coalesce(p_bio, ''));
  if p_name = '' then raise exception 'Group name is required.'; end if;
  if char_length(p_name) > 60 then raise exception 'Group names are limited to 60 characters.'; end if;
  if char_length(p_bio) > 160 then raise exception 'Group bios are limited to 160 characters.'; end if;

  update public.dm_conversations
  set name = p_name, bio = p_bio
  where id = p_conversation_id and is_group = true and created_by = auth.uid()
  returning * into result;
  if result.id is null then raise exception 'Only the group creator can edit this group.'; end if;
  return result;
end;
$$;
revoke all on function public.blur_update_group_settings(uuid, text, text) from public;
grant execute on function public.blur_update_group_settings(uuid, text, text) to authenticated;

-- A creator may remove another member; members can still remove themselves.
drop policy if exists "Group creator can remove members" on public.group_members;
create policy "Group creator can remove members" on public.group_members
for delete to authenticated
using (
  user_id = auth.uid()
  or public.blur_is_group_creator(conversation_id, auth.uid())
);
