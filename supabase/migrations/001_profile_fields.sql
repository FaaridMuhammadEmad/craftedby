-- Migration for existing projects: replace mobile with gender / dob / country / city.
-- Run once in the Supabase SQL Editor. (Fresh projects get this from schema.sql already.)

alter table public.profiles drop column if exists mobile;
alter table public.profiles
  add column if not exists gender text,
  add column if not exists dob date,
  add column if not exists country text,
  add column if not exists city text;

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
