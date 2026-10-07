-- Blur Chat — multiple profile roles
-- Run once in the Supabase SQL editor after the existing roles migration.
-- The legacy `role` column remains as a compatibility mirror for older RLS
-- policies; the client reads `roles` when it is available.

alter table public.profiles
  add column if not exists roles text[] not null default array['member']::text[];

-- Carry existing single-role assignments into the new array. Do not replace a
-- role list that has already been configured manually.
update public.profiles
set roles = array[lower(trim(role))]::text[]
where lower(trim(coalesce(role, 'member'))) in ('owner','admin','community_manager','moderator','member')
  and (roles is null or roles = array['member']::text[])
  and lower(trim(coalesce(role, 'member'))) <> 'member';

-- Remove malformed/unknown role names and guarantee at least Member.
update public.profiles p
set roles = cleaned.roles
from (
  select p2.id,
         coalesce(
           array_agg(distinct lower(trim(item)) order by case lower(trim(item))
             when 'owner' then 1 when 'community_manager' then 2 when 'admin' then 3
             when 'moderator' then 4 else 5 end),
           array['member']::text[]
         ) as roles
  from public.profiles p2
  left join lateral unnest(coalesce(p2.roles, array[]::text[])) as raw(item) on true
  where lower(trim(coalesce(raw.item, ''))) in ('owner','admin','community_manager','moderator','member')
  group by p2.id
) cleaned
where p.id = cleaned.id;

alter table public.profiles drop constraint if exists profiles_roles_check;
alter table public.profiles add constraint profiles_roles_check check (
  cardinality(roles) > 0
  and roles <@ array['owner','admin','community_manager','moderator','member']::text[]
);

-- Keep browser profile updates from escalating roles. SQL editor / trusted
-- maintenance (where auth.uid() is null) can still assign them. The legacy
-- role column mirrors the highest role so older policies keep working.
create or replace function public.protect_role_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed text[] := array['owner','admin','community_manager','moderator','member']::text[];
  normalized_roles text[];
begin
  if auth.uid() is not null then
    if tg_op = 'UPDATE' and new.role is distinct from old.role then
      new.role := old.role;
    end if;
    if tg_op = 'UPDATE' and new.roles is distinct from old.roles then
      new.roles := old.roles;
    end if;
  elsif tg_op = 'UPDATE'
    and new.role is distinct from old.role
    and new.roles is not distinct from old.roles then
    -- Preserve the familiar `set role = 'admin'` maintenance workflow.
    new.roles := array[lower(trim(coalesce(new.role, 'member')))];
  elsif tg_op = 'INSERT'
    and lower(trim(coalesce(new.role, 'member'))) <> 'member'
    and (new.roles is null or new.roles = array['member']::text[]) then
    new.roles := array[lower(trim(new.role))];
  end if;

  select coalesce(
    array_agg(distinct lower(trim(item)) order by case lower(trim(item))
      when 'owner' then 1 when 'community_manager' then 2 when 'admin' then 3
      when 'moderator' then 4 else 5 end),
    array['member']::text[]
  ) into normalized_roles
  from unnest(coalesce(new.roles, array[]::text[])) as raw(item)
  where lower(trim(raw.item)) = any(allowed);

  if cardinality(normalized_roles) = 0 then
    normalized_roles := array['member']::text[];
  end if;
  new.roles := normalized_roles;

  select item into new.role
  from unnest(new.roles) as raw(item)
  order by case lower(item)
    when 'owner' then 4
    when 'admin' then 3
    when 'community_manager' then 3
    when 'moderator' then 2
    else 1
  end desc, lower(item)
  limit 1;

  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
before insert or update on public.profiles
for each row execute function public.protect_role_column();

-- Example trusted assignments:
-- update public.profiles set roles = array['admin','moderator']::text[] where username = 'example';
