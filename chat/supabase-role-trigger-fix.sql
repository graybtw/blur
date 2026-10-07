-- Allow manual role assignments from the Supabase SQL editor while keeping
-- browser profile updates from escalating their own role.
create or replace function public.protect_role_column()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
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

update public.profiles
set role = 'admin'
where id = '349a1f85-fdd2-42bf-ac90-8b6e5b3ee303';
