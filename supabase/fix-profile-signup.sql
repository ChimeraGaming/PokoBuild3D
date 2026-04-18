create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  requested_display_name text;
begin
  requested_username := trim(coalesce(new.raw_user_meta_data->>'username', ''));
  requested_display_name := trim(coalesce(new.raw_user_meta_data->>'display_name', ''));

  if requested_username = '' then
    requested_username := split_part(coalesce(new.email, 'builder'), '@', 1);
  end if;

  if requested_username = '' then
    requested_username := 'builder-' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (
    id,
    username,
    display_name,
    bio,
    avatar_url,
    socials_json,
    created_at
  )
  values (
    new.id,
    requested_username,
    coalesce(nullif(requested_display_name, ''), split_part(coalesce(new.email, 'Builder'), '@', 1)),
    '',
    '',
    '[]'::jsonb,
    timezone('utc', now())
  )
  on conflict (id) do update
  set
    username = excluded.username,
    display_name = excluded.display_name;

  return new;
end;
$$;

alter table public.profiles
add column if not exists socials_json jsonb not null default '[]'::jsonb;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
  id,
  username,
  display_name,
  bio,
  avatar_url,
  socials_json,
  created_at
)
select
  users.id,
  coalesce(
    nullif(trim(users.raw_user_meta_data->>'username'), ''),
    split_part(coalesce(users.email, 'builder'), '@', 1) || '-' || substr(users.id::text, 1, 8)
  ),
  coalesce(
    nullif(trim(users.raw_user_meta_data->>'display_name'), ''),
    split_part(coalesce(users.email, 'Builder'), '@', 1)
  ),
  '',
  '',
  '[]'::jsonb,
  timezone('utc', now())
from auth.users as users
left join public.profiles on profiles.id = users.id
where profiles.id is null
on conflict (id) do nothing;
