-- Blur Achievements / Tokens / Profile Effects
--
-- Run this migration in Supabase SQL editor after the existing Blur schema.
-- It is intentionally additive: existing profiles, messages, preferences,
-- and the older inventory columns are left untouched.

create table if not exists public.blur_effect_catalog (
  id text primary key,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  rarity text not null default 'common' check (rarity in ('common','rare','epic')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.blur_achievement_catalog (
  id text primary key,
  name text not null,
  description text not null default '',
  reward integer not null check (reward > 0),
  icon text not null default 'spark',
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.blur_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.blur_achievement_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.blur_achievement_catalog(id) on delete cascade,
  reward integer not null check (reward > 0),
  claimed_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.blur_effect_ownership (
  user_id uuid not null references auth.users(id) on delete cascade,
  effect_id text not null references public.blur_effect_catalog(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (user_id, effect_id)
);

-- This is deliberately separate from profiles: it exposes only the one
-- public cosmetic fact other users need in order to decorate an avatar.
create table if not exists public.blur_effect_equipped (
  user_id uuid primary key references auth.users(id) on delete cascade,
  effect_id text references public.blur_effect_catalog(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists blur_messages_user_created_idx
  on public.messages (user_id, created_at);

alter table public.blur_effect_catalog enable row level security;
alter table public.blur_achievement_catalog enable row level security;
alter table public.blur_tokens enable row level security;
alter table public.blur_achievement_claims enable row level security;
alter table public.blur_effect_ownership enable row level security;
alter table public.blur_effect_equipped enable row level security;

drop policy if exists "Blur effect catalog is public" on public.blur_effect_catalog;
create policy "Blur effect catalog is public" on public.blur_effect_catalog
  for select to anon, authenticated using (active = true);
drop policy if exists "Blur achievement catalog is public" on public.blur_achievement_catalog;
create policy "Blur achievement catalog is public" on public.blur_achievement_catalog
  for select to anon, authenticated using (active = true);
drop policy if exists "Users can view their Blur tokens" on public.blur_tokens;
create policy "Users can view their Blur tokens" on public.blur_tokens
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can view their achievement claims" on public.blur_achievement_claims;
create policy "Users can view their achievement claims" on public.blur_achievement_claims
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can view their effect ownership" on public.blur_effect_ownership;
create policy "Users can view their effect ownership" on public.blur_effect_ownership
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Equipped effects are public" on public.blur_effect_equipped;
create policy "Equipped effects are public" on public.blur_effect_equipped
  for select to authenticated using (true);

insert into public.blur_effect_catalog (id, name, description, price, rarity) values
  ('glow', 'Glow', 'A quiet aura that brings the avatar forward.', 80, 'common'),
  ('pulse', 'Pulse', 'A soft ring that breathes around your avatar.', 125, 'common'),
  ('spark', 'Spark', 'A tiny constellation of sparks around the frame.', 175, 'rare'),
  ('orbit', 'Orbit', 'A small light that loops around your profile picture.', 220, 'rare'),
  ('holographic', 'Holographic', 'A shifting spectrum edge with a glassy sheen.', 300, 'epic'),
  ('pixel', 'Pixel', 'A crisp, retro pixel border for your profile picture.', 240, 'rare'),
  ('flame', 'Flame', 'A warm animated flame that stays behind the avatar.', 400, 'epic'),
  ('fox-hat', 'Fox Hat', 'A tiny fox hat with a short, choppy blink.', 350, 'epic'),
  ('bones', 'Bones', 'Four quiet bone pieces tucked around your avatar.', 280, 'rare'),
  ('angry', 'Angry', 'A sharp red reaction ring for your profile.', 320, 'epic'),
  ('toast', 'Toast', 'A toast frame that gets eaten away until it disappears.', 200, 'common'),
  ('pancakes', 'Pancakes', 'A syrupy stack of pancakes with a warm little wobble.', 260, 'rare'),
  ('egg', 'Egg Drop', 'A big egg drops in, lands, then rolls off the side.', 340, 'rare'),
  ('coffee', 'Coffee', 'A cozy coffee wreath with drifting steam.', 240, 'common'),
  ('leaf-wreath', 'Leaf Wreath', 'A quiet ring of leaves and spring buds.', 220, 'common'),
  ('fireflies', 'Fireflies', 'Small lights glowing through a midnight garden.', 300, 'rare'),
  ('arcade-coins', 'Arcade Coins', 'Bright coins and score sparks from the high-score screen.', 330, 'rare'),
  ('arcade-hearts', 'Player Two', 'A heart meter and tiny controller sparks.', 360, 'epic'),
  ('comet', 'Comet', 'A bright comet sweeping around your avatar.', 380, 'epic'),
  ('moon-stars', 'Moon & Stars', 'A calm crescent moon with a tiny orbit of stars.', 420, 'epic'),
  ('rain-cloud', 'Rain Cloud', 'A friendly little cloud with bright drops and lightning.', 270, 'rare'),
  ('snowflake-crown', 'Snowflake Crown', 'An icy crown of crystalline snowflakes.', 340, 'rare'),
  ('pumpkin-vine', 'Pumpkin Vine', 'A curling autumn vine with bright little pumpkins.', 290, 'rare'),
  ('ocean-bubbles', 'Ocean Bubbles', 'Seafoam bubbles and a tiny shell around the avatar.', 310, 'rare')
on conflict (id) do update set
  name = excluded.name, description = excluded.description,
  price = excluded.price, rarity = excluded.rarity, active = true;

insert into public.blur_achievement_catalog (id, name, description, reward, icon, sort_order) values
  ('welcome', 'Welcome to Blur', 'Create your Blur account and claim your first Tokens.', 50, 'wave', 10),
  ('first-message', 'Say hello', 'Send your first message in Blur Chat.', 60, 'message', 20),
  ('chatter', 'Keep talking', 'Send 10 messages from your Blur account.', 120, 'spark', 30),
  ('personal-touch', 'Make it yours', 'Add a profile detail so people know you.', 75, 'profile', 40),
  ('test-10000', 'Test Reward', 'Temporary testing reward. Claim once to add 10,000 Tokens.', 10000, 'spark', 9990)
on conflict (id) do update set
  name = excluded.name, description = excluded.description,
  reward = excluded.reward, icon = excluded.icon, sort_order = excluded.sort_order, active = true;

-- Returns server-calculated completion state. The browser never submits a
-- progress value or reward amount.
create or replace function public.blur_achievement_status()
returns table (id text, name text, description text, reward integer, icon text,
               completed boolean, claimed boolean, progress integer, target integer)
language sql security definer set search_path = public
as $$
  select a.id, a.name, a.description, a.reward, a.icon,
    case a.id
      when 'welcome' then exists (select 1 from public.profiles p where p.id = auth.uid())
      when 'first-message' then exists (select 1 from public.messages m where m.user_id = auth.uid())
      when 'chatter' then (select count(*) from public.messages m where m.user_id = auth.uid()) >= 10
      when 'personal-touch' then exists (
        select 1 from public.profiles p where p.id = auth.uid()
          and (nullif(trim(coalesce(p.display_name, '')), '') is not null
            or nullif(trim(coalesce(p.bio, '')), '') is not null
            or nullif(trim(coalesce(p.pronouns, '')), '') is not null
            or nullif(trim(coalesce(p.status_message, '')), '') is not null)
      )
      when 'test-10000' then true
      else false
    end as completed,
    exists (select 1 from public.blur_achievement_claims c
      where c.user_id = auth.uid() and c.achievement_id = a.id) as claimed,
    case a.id
      when 'welcome' then case when exists (select 1 from public.profiles p where p.id = auth.uid()) then 1 else 0 end
      when 'first-message' then case when exists (select 1 from public.messages m where m.user_id = auth.uid()) then 1 else 0 end
      when 'chatter' then least(10, (select count(*)::integer from public.messages m where m.user_id = auth.uid()))
      when 'personal-touch' then case when exists (
        select 1 from public.profiles p where p.id = auth.uid()
          and (nullif(trim(coalesce(p.display_name, '')), '') is not null
            or nullif(trim(coalesce(p.bio, '')), '') is not null
            or nullif(trim(coalesce(p.pronouns, '')), '') is not null
            or nullif(trim(coalesce(p.status_message, '')), '') is not null)
      ) then 1 else 0 end
      when 'test-10000' then 1
      else 0
    end as progress,
    case a.id when 'chatter' then 10 else 1 end as target
  from public.blur_achievement_catalog a
  where a.active = true
  order by a.sort_order, a.id;
$$;

create or replace function public.blur_claim_achievement(p_achievement_id text)
returns table (claimed boolean, reward integer, balance integer)
language plpgsql security definer set search_path = public
as $$
declare
  achievement public.blur_achievement_catalog%rowtype;
  new_claim boolean := false;
  next_balance integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into achievement from public.blur_achievement_catalog
    where id = p_achievement_id and active = true;
  if not found then raise exception 'Achievement not found'; end if;
  if not exists (select 1 from public.blur_achievement_status() s where s.id = p_achievement_id and s.completed) then
    raise exception 'Achievement is not complete';
  end if;
  insert into public.blur_achievement_claims(user_id, achievement_id, reward)
    values (auth.uid(), achievement.id, achievement.reward)
    on conflict (user_id, achievement_id) do nothing;
  new_claim := found;
  insert into public.blur_tokens(user_id, balance) values (auth.uid(), 0)
    on conflict (user_id) do nothing;
  if new_claim then
    update public.blur_tokens as wallet_row
      set balance = wallet_row.balance + achievement.reward, updated_at = now()
      where user_id = auth.uid() returning wallet_row.balance into next_balance;
  else
    select wallet_row.balance into next_balance from public.blur_tokens as wallet_row where wallet_row.user_id = auth.uid();
  end if;
  return query select new_claim, case when new_claim then achievement.reward else 0 end, coalesce(next_balance, 0);
end;
$$;

create or replace function public.blur_purchase_effect(p_effect_id text)
returns table (purchased boolean, balance integer)
language plpgsql security definer set search_path = public
as $$
declare
  effect public.blur_effect_catalog%rowtype;
  wallet public.blur_tokens%rowtype;
  did_purchase boolean := false;
  next_balance integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into effect from public.blur_effect_catalog where id = p_effect_id and active = true;
  if not found then raise exception 'Effect not found'; end if;
  insert into public.blur_tokens(user_id, balance) values (auth.uid(), 0) on conflict (user_id) do nothing;
  select * into wallet from public.blur_tokens where user_id = auth.uid() for update;
  -- Re-check ownership after taking the wallet lock. This closes the race
  -- where two tabs try to buy the same effect at the same time.
  if exists (select 1 from public.blur_effect_ownership where user_id = auth.uid() and effect_id = effect.id) then
    return query select false, coalesce(wallet.balance, 0); return;
  end if;
  if wallet.balance < effect.price then raise exception 'Not enough Tokens'; end if;
  insert into public.blur_effect_ownership(user_id, effect_id) values (auth.uid(), effect.id)
    on conflict (user_id, effect_id) do nothing;
  did_purchase := found;
  if not did_purchase then
    return query select false, coalesce(wallet.balance, 0); return;
  end if;
  update public.blur_tokens as wallet_row
    set balance = wallet_row.balance - effect.price, updated_at = now()
    where user_id = auth.uid();
  select wallet_row.balance into next_balance from public.blur_tokens as wallet_row where wallet_row.user_id = auth.uid();
  return query select did_purchase, next_balance;
end;
$$;

create or replace function public.blur_equip_effect(p_effect_id text default null)
returns text
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_effect_id is null then
    delete from public.blur_effect_equipped where user_id = auth.uid();
    return null;
  end if;
  if not exists (select 1 from public.blur_effect_ownership where user_id = auth.uid() and effect_id = p_effect_id) then
    raise exception 'Effect is not owned';
  end if;
  insert into public.blur_effect_equipped(user_id, effect_id, updated_at) values (auth.uid(), p_effect_id, now())
    on conflict (user_id) do update set effect_id = excluded.effect_id, updated_at = now();
  return p_effect_id;
end;
$$;

grant execute on function public.blur_achievement_status() to authenticated;
grant execute on function public.blur_claim_achievement(text) to authenticated;
grant execute on function public.blur_purchase_effect(text) to authenticated;
grant execute on function public.blur_equip_effect(text) to authenticated;
notify pgrst, 'reload schema';
