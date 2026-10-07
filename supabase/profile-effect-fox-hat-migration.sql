-- Add the lightweight animated Fox Hat cosmetic to an existing cosmetics install.
-- Safe to run more than once; this does not change ownership or equipped effects.
insert into public.blur_effect_catalog (id, name, description, price, rarity, active)
values (
  'fox-hat',
  'Fox Hat',
  'A tiny fox hat with a short, choppy blink.',
  350,
  'epic',
  true
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  rarity = excluded.rarity,
  active = true;
