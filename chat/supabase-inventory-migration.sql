-- Blur Inventory / profile cosmetics
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.profiles
  add column if not exists blur_credits integer not null default 0 check (blur_credits >= 0),
  add column if not exists owned_pfp_effects text[] not null default '{}',
  add column if not exists owned_profile_effects text[] not null default '{}',
  add column if not exists equipped_pfp_effect text,
  add column if not exists equipped_profile_effect text;

-- Keep the cosmetic catalog intentionally narrow in v1. The client filters
-- unknown ids, while these checks prevent malformed values being published.
alter table public.profiles drop constraint if exists profiles_pfp_effects_check;
alter table public.profiles add constraint profiles_pfp_effects_check
  check (owned_pfp_effects <@ array['orbit-halo', 'prism-orbit']::text[]);

alter table public.profiles drop constraint if exists profiles_profile_effects_check;
alter table public.profiles add constraint profiles_profile_effects_check
  check (owned_profile_effects <@ array['nocturne-frame']::text[]);

alter table public.profiles drop constraint if exists profiles_equipped_pfp_check;
alter table public.profiles add constraint profiles_equipped_pfp_check
  check (equipped_pfp_effect is null or equipped_pfp_effect in ('orbit-halo', 'prism-orbit'));

alter table public.profiles drop constraint if exists profiles_equipped_profile_check;
alter table public.profiles add constraint profiles_equipped_profile_check
  check (equipped_profile_effect is null or equipped_profile_effect = 'nocturne-frame');
