-- Add the Bones, Angry, and Toast profile cosmetics to an existing cosmetics install.
-- Safe to run more than once; this does not change ownership or equipped effects.
insert into public.blur_effect_catalog (id, name, description, price, rarity, active)
values
  ('bones', 'Bones', 'Four quiet bone pieces tucked around your avatar.', 280, 'rare', true),
  ('angry', 'Angry', 'A sharp red reaction ring for your profile.', 320, 'epic', true),
  ('toast', 'Toast', 'A toast frame that gets eaten away until it disappears.', 200, 'common', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  rarity = excluded.rarity,
  active = true;
