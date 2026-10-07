-- Remove the retired Blur profile badge feature.
alter table public.profiles
  drop column if exists badges;
