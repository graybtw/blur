-- Run this once in Supabase SQL editor for an existing Blur project.
-- Badges are stored as stable ids, e.g. ["developer", "travelersdomain"].

alter table public.profiles add column if not exists badges jsonb not null default '[]'::jsonb;
alter table public.profiles drop constraint if exists profiles_badges_array_check;
alter table public.profiles add constraint profiles_badges_array_check
  check (jsonb_typeof(badges) = 'array');

-- Ask PostgREST to refresh its schema cache immediately.
notify pgrst, 'reload schema';

update public.profiles
set badges = case
  when badges @> '["developer"]'::jsonb then badges
  else badges || '["developer"]'::jsonb
end
where coalesce(role, '') = 'owner';

-- Backfill the badge for existing community-theme creators when the theme
-- table has already been installed. The standalone migration in
-- supabase/ can be used if this file was run before community themes existed.
do $$
begin
  if to_regclass('public.community_themes') is not null then
    update public.profiles as profiles
    set badges = case
      when profiles.badges @> '["thememaker"]'::jsonb then profiles.badges
      else profiles.badges || '["thememaker"]'::jsonb
    end
    where exists (
      select 1 from public.community_themes as themes
      where themes.creator_id = profiles.id
    );
  end if;
end
$$;
