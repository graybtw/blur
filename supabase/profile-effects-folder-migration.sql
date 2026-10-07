-- Profile-wide APNG effects shipped in the site's /effects folder.
-- Run after profile-effects-open-access-migration.sql. The existing
-- blur_equip_effect RPC validates against this catalog, so these rows make
-- the new client-side artwork globally equipable and publicly readable.
insert into public.blur_effect_catalog (id, name, description, price, rarity, active)
values
  ('profile-boost-relic', 'Boost Relic', 'A bright relic surge that sweeps across your profile.', 0, 'common', true),
  ('profile-cyberspace', 'Cyberspace', 'A cool digital field flickers around your profile.', 0, 'common', true),
  ('profile-dark-omens', 'Dark Omens', 'Dark silhouettes and omens drift through your profile.', 0, 'common', true),
  ('profile-dragon-dance', 'Dragon Dance', 'A dragon coils through a warm, animated profile scene.', 0, 'common', true),
  ('profile-hydro-blast', 'Hydro Blast', 'A splash of water energy washes across the profile.', 0, 'common', true),
  ('profile-ki-detonate', 'Ki Detonate', 'A concentrated burst of energy breaks into motion.', 0, 'common', true),
  ('profile-magic-hearts', 'Magic Hearts', 'A soft field of magical hearts surrounds the profile.', 0, 'common', true),
  ('profile-mastery', 'Mastery', 'A polished, focused profile animation with a confident finish.', 0, 'common', true),
  ('profile-pixie-dust', 'Pixie Dust', 'A trail of pixie dust glitters around your profile.', 0, 'common', true),
  ('profile-power-surge', 'Power Surge', 'A sharp surge of power travels across the profile.', 0, 'common', true),
  ('profile-spring-bloom', 'Spring Bloom', 'A fresh bloom opens into a looping profile scene.', 0, 'common', true),
  ('profile-sushi-mania', 'Sushi Mania', 'A playful sushi-themed animation brings the profile to life.', 0, 'common', true),
  ('profile-vortex', 'Vortex', 'A swirling vortex pulls the profile into motion.', 0, 'common', true),
  ('profile-zombie-slime', 'Zombie Slime', 'A spooky slime animation crawls through the profile.', 0, 'common', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  rarity = excluded.rarity,
  active = excluded.active;

-- Keep Profile Effects independent from the Avatar Border slot so users can
-- equip one of each at the same time.
create table if not exists public.blur_profile_effect_equipped (
  user_id uuid primary key references auth.users(id) on delete cascade,
  effect_id text references public.blur_effect_catalog(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.blur_profile_effect_equipped enable row level security;
drop policy if exists "Profile effects are public" on public.blur_profile_effect_equipped;
create policy "Profile effects are public" on public.blur_profile_effect_equipped
  for select to authenticated using (true);

create or replace function public.blur_equip_profile_effect(p_effect_id text default null)
returns text
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_effect_id is null then
    delete from public.blur_profile_effect_equipped where user_id = auth.uid();
    return null;
  end if;
  if not exists (
    select 1 from public.blur_effect_catalog
    where id = p_effect_id and active = true
      and id like 'profile-%'
  ) then
    raise exception 'Profile Effect not found';
  end if;
  insert into public.blur_profile_effect_equipped(user_id, effect_id, updated_at)
    values (auth.uid(), p_effect_id, now())
    on conflict (user_id) do update
      set effect_id = excluded.effect_id, updated_at = now();
  return p_effect_id;
end;
$$;
grant execute on function public.blur_equip_profile_effect(text) to authenticated;

notify pgrst, 'reload schema';
