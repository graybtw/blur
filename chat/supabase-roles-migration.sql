-- Global Blur roles. Existing users default safely to member.
alter table public.profiles add column if not exists role text not null default 'member';
create or replace function public.protect_role_column()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then new.role := old.role; end if;
  return new;
end;
$$;
update public.profiles
set role = case
  when lower(trim(role)) in ('owner','admin','community_manager','moderator','member') then lower(trim(role))
  else 'member'
end;
alter table public.profiles alter column role set default 'member';
alter table public.profiles alter column role set not null;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('owner','admin','community_manager','moderator','member'));

create or replace function public.protect_role_column()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is populated for normal frontend requests. The Supabase SQL
  -- editor runs with no JWT, so manual role assignments remain allowed.
  if auth.uid() is not null then
    -- A browser client may create only a member profile. On updates, keep
    -- the existing database role even if a forged payload includes `role`.
    if tg_op = 'INSERT' then
      new.role := 'member';
    elsif new.role is distinct from old.role then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before insert or update on public.profiles
for each row execute function public.protect_role_column();
