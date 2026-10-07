-- Blur community themes
-- Run once in Supabase SQL Editor after supabase-schema.sql.

create table if not exists public.community_themes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 36),
  description text not null default '' check (char_length(description) <= 100),
  colors jsonb not null,
  font text not null default 'system',
  created_at timestamptz not null default now()
);

-- Upgrade installations created with the original three-swatch format. Old
-- array themes remain readable; new themes use a named semantic color object.
alter table public.community_themes
  add column if not exists font text not null default 'system';

alter table public.community_themes
  drop constraint if exists community_themes_colors_check;

alter table public.community_themes
  add constraint community_themes_colors_check check (
    (jsonb_typeof(colors) = 'array' and jsonb_array_length(colors) = 3)
    or (jsonb_typeof(colors) = 'object' and colors ? 'background' and colors ? 'accent')
  );

create index if not exists community_themes_created_idx
  on public.community_themes (created_at desc);

alter table public.community_themes enable row level security;

drop policy if exists "Community themes are viewable by authenticated users"
  on public.community_themes;
create policy "Community themes are viewable by authenticated users"
  on public.community_themes for select
  to authenticated
  using (true);

drop policy if exists "Users can publish their own community themes"
  on public.community_themes;
create policy "Users can publish their own community themes"
  on public.community_themes for insert
  to authenticated
  with check (auth.uid() = creator_id);

drop policy if exists "Users can update their own community themes"
  on public.community_themes;
create policy "Users can update their own community themes"
  on public.community_themes for update
  to authenticated
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

drop policy if exists "Users can delete their own community themes"
  on public.community_themes;
create policy "Users can delete their own community themes"
  on public.community_themes for delete
  to authenticated
  using (auth.uid() = creator_id);
