-- Separate forum thread membership from optional message-to-message replies.
-- Run this once for an existing database.

alter table public.messages
  add column if not exists forum_post_id bigint references public.messages(id) on delete cascade;

create index if not exists messages_forum_post_idx
  on public.messages (forum_post_id, created_at);

-- Preserve existing forum conversations while allowing future comments to be
-- stored without looking like replies to the root post.
update public.messages as comments
set forum_post_id = comments.reply_to_id
where comments.forum_post_id is null
  and comments.reply_to_id is not null
  and exists (
    select 1 from public.messages as root
    where root.id = comments.reply_to_id
      and root.forum_title is not null
  );

notify pgrst, 'reload schema';
