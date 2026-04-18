create table if not exists public.chat_messages (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message_text text not null,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$$;

create index if not exists chat_messages_created_at_idx
on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "chat messages public read" on public.chat_messages;
create policy "chat messages public read"
on public.chat_messages
for select
using (true);

drop policy if exists "chat messages owner insert" on public.chat_messages;
create policy "chat messages owner insert"
on public.chat_messages
for insert
with check (auth.uid() = user_id);

create or replace function public.trim_chat_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.chat_messages
  where id in (
    select id
    from public.chat_messages
    order by created_at desc, id desc
    offset 100
  );

  return null;
end;
$$;

drop trigger if exists trim_chat_messages_after_insert on public.chat_messages;
create trigger trim_chat_messages_after_insert
after insert on public.chat_messages
for each statement
execute function public.trim_chat_messages();

create or replace function public.normalize_profile_special_tags(next_tags jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_agg(tag order by sort_order, tag), '[]'::jsonb)
  from (
    select distinct
      value as tag,
      case value
        when 'Owner' then 1
        when 'Site Admin' then 2
        when 'Community Expert' then 3
        when 'Early Bird' then 4
        else 99
      end as sort_order
    from jsonb_array_elements_text(coalesce(next_tags, '[]'::jsonb))
    where value in ('Owner', 'Site Admin', 'Community Expert', 'Early Bird')
  ) as filtered_tags;
$$;

create or replace function public.get_manageable_profile_special_tags(next_tags jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_agg(tag order by sort_order, tag), '[]'::jsonb)
  from (
    select distinct
      value as tag,
      case value
        when 'Owner' then 1
        when 'Site Admin' then 2
        when 'Community Expert' then 3
        else 99
      end as sort_order
    from jsonb_array_elements_text(coalesce(next_tags, '[]'::jsonb))
    where value in ('Owner', 'Site Admin', 'Community Expert')
  ) as filtered_tags;
$$;

create or replace function public.get_automatic_profile_special_tags(next_tags jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_agg(tag order by tag), '[]'::jsonb)
  from (
    select distinct value as tag
    from jsonb_array_elements_text(coalesce(next_tags, '[]'::jsonb))
    where value in ('Early Bird')
  ) as filtered_tags;
$$;

create or replace function public.merge_profile_special_tags(manageable_tags jsonb, automatic_tags jsonb)
returns jsonb
language sql
immutable
as $$
  select public.normalize_profile_special_tags(
    coalesce(manageable_tags, '[]'::jsonb) || coalesce(automatic_tags, '[]'::jsonb)
  );
$$;

create or replace function public.try_award_early_bird(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  awarded_count integer;
begin
  perform pg_advisory_xact_lock(1202);

  select count(*)
  into awarded_count
  from public.profiles
  where coalesce(special_tags_json, '[]'::jsonb) @> '["Early Bird"]'::jsonb;

  if awarded_count >= 100 then
    return;
  end if;

  update public.profiles
  set special_tags_json = public.merge_profile_special_tags(
    public.get_manageable_profile_special_tags(special_tags_json),
    '["Early Bird"]'::jsonb
  )
  where id = target_profile_id
    and not coalesce(special_tags_json, '[]'::jsonb) @> '["Early Bird"]'::jsonb;
end;
$$;

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

  if coalesce(new.email_confirmed_at, new.confirmed_at) is not null then
    perform public.try_award_early_bird(new.id);
  end if;

  return new;
end;
$$;

create or replace function public.handle_verified_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(old.email_confirmed_at, old.confirmed_at) is null
    and coalesce(new.email_confirmed_at, new.confirmed_at) is not null then
    perform public.try_award_early_bird(new.id);
  end if;

  return new;
end;
$$;

create or replace function public.set_profile_special_tags(target_profile_id uuid, next_tags jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_tags jsonb;
  automatic_tags jsonb;
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

  select public.get_automatic_profile_special_tags(special_tags_json)
  into automatic_tags
  from public.profiles
  where id = target_profile_id;

  normalized_tags := public.merge_profile_special_tags(
    public.get_manageable_profile_special_tags(next_tags),
    automatic_tags
  );

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

drop trigger if exists on_auth_user_verified on auth.users;
create trigger on_auth_user_verified
after update on auth.users
for each row
execute function public.handle_verified_user();
