alter table public.profiles
add column if not exists featured_badge_key text not null default '';

update public.profiles
set featured_badge_key = ''
where featured_badge_key is null;
