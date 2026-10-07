-- Award Theme Maker to everyone who already published a community theme.
-- Run after the profile badges and community themes migrations.

update public.profiles as profiles
set badges = case
  when profiles.badges @> '["thememaker"]'::jsonb then profiles.badges
  else profiles.badges || '["thememaker"]'::jsonb
end
where exists (
  select 1
  from public.community_themes as themes
  where themes.creator_id = profiles.id
);

notify pgrst, 'reload schema';
