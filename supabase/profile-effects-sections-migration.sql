-- Add the sectioned Profile Effects collection.
-- Run after profile-effects-economy-migration.sql. Safe to run repeatedly.
-- Sections are presentation metadata in the client; rarity remains in the
-- catalog for backwards-compatible pricing/economy rules.

insert into public.blur_effect_catalog (id, name, description, price, rarity, active)
values
  ('pancakes', 'Pancakes', 'A syrupy stack of pancakes with a warm little wobble.', 260, 'rare', true),
  ('egg', 'Egg Drop', 'A big egg drops in, lands, then rolls off the side.', 340, 'rare', true),
  ('coffee', 'Coffee', 'A cozy coffee wreath with drifting steam.', 240, 'common', true),
  ('leaf-wreath', 'Leaf Wreath', 'A quiet ring of leaves and spring buds.', 220, 'common', true),
  ('fireflies', 'Fireflies', 'Small lights glowing through a midnight garden.', 300, 'rare', true),
  ('arcade-coins', 'Arcade Coins', 'Bright coins and score sparks from the high-score screen.', 330, 'rare', true),
  ('arcade-hearts', 'Player Two', 'A heart meter and tiny controller sparks.', 360, 'epic', true),
  ('comet', 'Comet', 'A bright comet sweeping around your avatar.', 380, 'epic', true),
  ('moon-stars', 'Moon & Stars', 'A calm crescent moon with a tiny orbit of stars.', 420, 'epic', true),
  ('rain-cloud', 'Rain Cloud', 'A friendly little cloud with bright drops and lightning.', 270, 'rare', true),
  ('snowflake-crown', 'Snowflake Crown', 'An icy crown of crystalline snowflakes.', 340, 'rare', true),
  ('pumpkin-vine', 'Pumpkin Vine', 'A curling autumn vine with bright little pumpkins.', 290, 'rare', true),
  ('ocean-bubbles', 'Ocean Bubbles', 'Seafoam bubbles and a tiny shell around the avatar.', 310, 'rare', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  rarity = excluded.rarity,
  active = true;
