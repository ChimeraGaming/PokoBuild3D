alter table public.profiles
add column if not exists special_tags_json jsonb not null default '[]'::jsonb;

alter table public.profiles
add column if not exists featured_badge_key text not null default '';

update public.profiles
set special_tags_json = '[]'::jsonb
where special_tags_json is null;

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
    special_tags_json,
    created_at
  )
  values (
    new.id,
    requested_username,
    coalesce(nullif(requested_display_name, ''), split_part(coalesce(new.email, 'Builder'), '@', 1)),
    '',
    '',
    '[]'::jsonb,
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
  special_tags_json,
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
  '[]'::jsonb,
  timezone('utc', now())
from auth.users as users
left join public.profiles on profiles.id = users.id
where profiles.id is null
on conflict (id) do nothing;

create or replace function public.set_profile_special_tags(target_profile_id uuid, next_tags jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_tags jsonb;
  updated_profile public.profiles;
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and coalesce(special_tags_json, '[]'::jsonb) @> '["Owner"]'::jsonb
  ) then
    raise exception 'Only the owner can change special tags.';
  end if;

  if jsonb_typeof(coalesce(next_tags, '[]'::jsonb)) <> 'array' then
    raise exception 'Special tags payload must be an array.';
  end if;

  select coalesce(jsonb_agg(tag order by tag), '[]'::jsonb)
  into normalized_tags
  from (
    select distinct value as tag
    from jsonb_array_elements_text(coalesce(next_tags, '[]'::jsonb))
    where value in ('Owner', 'Site Admin', 'Community Expert')
    union
    select 'Early Bird'
    where exists (
      select 1
      from public.profiles
      where id = target_profile_id
        and coalesce(special_tags_json, '[]'::jsonb) @> '["Early Bird"]'::jsonb
    )
  ) as filtered_tags;

  update public.profiles
  set special_tags_json = normalized_tags
  where id = target_profile_id
  returning *
  into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found.';
  end if;

  return updated_profile;
end;
$$;

grant execute on function public.set_profile_special_tags(uuid, jsonb) to authenticated;

drop policy if exists "builds owner delete" on public.builds;
create policy "builds owner delete"
on public.builds
for delete
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and coalesce(profiles.special_tags_json, '[]'::jsonb) @> '["Owner"]'::jsonb
  )
);
