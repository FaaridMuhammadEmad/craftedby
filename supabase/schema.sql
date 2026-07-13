-- craftedBy — full database setup.
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- Idempotent-ish: safe to re-run on a fresh project; on an existing one, review before re-running.

-- ============================================================
-- profiles — one row per user, created automatically on signup
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  gender text,
  dob date,
  country text,
  city text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: owner can read" on public.profiles;
create policy "profiles: owner can read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: owner can update" on public.profiles;
create policy "profiles: owner can update"
  on public.profiles for update
  using (auth.uid() = id);

-- Create the profile row when a user signs up. The fields arrive in
-- auth metadata (options.data on supabase.auth.signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, gender, dob, country, city)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    nullif(new.raw_user_meta_data ->> 'gender', ''),
    nullif(new.raw_user_meta_data ->> 'dob', '')::date,
    nullif(new.raw_user_meta_data ->> 'country', ''),
    nullif(new.raw_user_meta_data ->> 'city', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Username availability check, callable pre-signup by anonymous clients.
-- SECURITY DEFINER so it can see profiles without exposing the table.
create or replace function public.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select candidate ~ '^[a-zA-Z0-9_]{3,20}$'
     and not exists (
       select 1 from public.profiles where username = lower(candidate)
     );
$$;

-- ============================================================
-- portfolios — up to 5 per user, public when status = 'active'
-- ============================================================
create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  username text not null,
  code text not null check (code ~ '^[0-9]{4}$'),
  slug text not null unique,           -- "<username>-<code>", the public URL path
  title text not null default 'My portfolio',
  template_id text not null,
  data jsonb not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolios_user_id_idx on public.portfolios (user_id);

alter table public.portfolios enable row level security;

-- Anyone (including anonymous visitors) can read ACTIVE portfolios;
-- owners can also read their inactive ones.
drop policy if exists "portfolios: active are public, owner sees all" on public.portfolios;
create policy "portfolios: active are public, owner sees all"
  on public.portfolios for select
  using (status = 'active' or auth.uid() = user_id);

drop policy if exists "portfolios: owner can insert" on public.portfolios;
create policy "portfolios: owner can insert"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

drop policy if exists "portfolios: owner can update" on public.portfolios;
create policy "portfolios: owner can update"
  on public.portfolios for update
  using (auth.uid() = user_id);

drop policy if exists "portfolios: owner can delete" on public.portfolios;
create policy "portfolios: owner can delete"
  on public.portfolios for delete
  using (auth.uid() = user_id);

-- Hard cap: 5 portfolios per account, enforced server-side.
create or replace function public.enforce_portfolio_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.portfolios where user_id = new.user_id) >= 5 then
    raise exception 'PORTFOLIO_LIMIT'
      using message = 'You already have 5 portfolios. Delete one before creating another.';
  end if;
  return new;
end;
$$;

drop trigger if exists portfolios_limit on public.portfolios;
create trigger portfolios_limit
  before insert on public.portfolios
  for each row execute function public.enforce_portfolio_limit();

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolios_touch on public.portfolios;
create trigger portfolios_touch
  before update on public.portfolios
  for each row execute function public.touch_updated_at();

-- Ensure the slug's username always belongs to the owner.
create or replace function public.enforce_slug_shape()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username <> (select username from public.profiles where id = new.user_id) then
    raise exception 'USERNAME_MISMATCH'
      using message = 'Portfolio username must match your account username.';
  end if;
  if new.slug <> new.username || '-' || new.code then
    raise exception 'BAD_SLUG'
      using message = 'Slug must be username-code.';
  end if;
  return new;
end;
$$;

drop trigger if exists portfolios_slug_shape on public.portfolios;
create trigger portfolios_slug_shape
  before insert or update on public.portfolios
  for each row execute function public.enforce_slug_shape();

-- ============================================================
-- storage — public "resumes" bucket, one folder per user
-- ============================================================
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

drop policy if exists "resumes: public read" on storage.objects;
create policy "resumes: public read"
  on storage.objects for select
  using (bucket_id = 'resumes');

drop policy if exists "resumes: owner can upload" on storage.objects;
create policy "resumes: owner can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "resumes: owner can replace" on storage.objects;
create policy "resumes: owner can replace"
  on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "resumes: owner can delete" on storage.objects;
create policy "resumes: owner can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
