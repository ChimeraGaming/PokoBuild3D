alter table public.profiles
add column if not exists socials_json jsonb not null default '[]'::jsonb;
