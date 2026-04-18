create extension if not exists "pgcrypto";

create or replace function public.set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
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

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_url text not null default '',
  socials_json jsonb not null default '[]'::jsonb,
  special_tags_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
add column if not exists socials_json jsonb not null default '[]'::jsonb;

alter table public.profiles
add column if not exists special_tags_json jsonb not null default '[]'::jsonb;

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

grant execute on function public.set_profile_special_tags(uuid, jsonb) to authenticated;

create table if not exists public.builds (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  biome text not null default '',
  difficulty text not null default 'easy',
  tags text[] not null default '{}',
  thumbnail_url text not null default '',
  asset_kind text not null default 'model',
  model_source text not null default 'editor',
  model_type text not null default 'editor',
  model_url text not null default '',
  resource_links_json jsonb not null default '[]'::jsonb,
  editor_data_json jsonb,
  is_published boolean not null default false,
  original_build_id text references public.builds (id) on delete set null,
  favorite_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.builds
add column if not exists asset_kind text not null default 'model';

alter table public.builds
add column if not exists model_source text not null default 'editor';

alter table public.builds
add column if not exists resource_links_json jsonb not null default '[]'::jsonb;

create table if not exists public.build_images (
  id text primary key,
  build_id text not null references public.builds (id) on delete cascade,
  image_url text not null,
  label text not null default 'Reference',
  sort_order integer not null default 0
);

create table if not exists public.build_materials (
  id text primary key,
  build_id text not null references public.builds (id) on delete cascade,
  item_name text not null,
  qty_required integer not null default 1,
  note text not null default '',
  sort_order integer not null default 0
);

create table if not exists public.build_steps (
  id text primary key,
  build_id text not null references public.builds (id) on delete cascade,
  step_title text not null default '',
  step_text text not null default '',
  image_url text not null default '',
  sort_order integer not null default 0
);

create table if not exists public.build_layers (
  id text primary key,
  build_id text not null references public.builds (id) on delete cascade,
  layer_index integer not null,
  layer_name text not null,
  note text not null default ''
);

create table if not exists public.build_blocks (
  id text primary key,
  build_id text not null references public.builds (id) on delete cascade,
  piece_type text not null,
  material_token text not null,
  x integer not null,
  y integer not null,
  z integer not null,
  rotation integer not null default 0,
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists public.favorites (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  build_id text not null references public.builds (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, build_id)
);

create table if not exists public.build_progress (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  build_id text not null references public.builds (id) on delete cascade,
  percent_complete integer not null default 0,
  gathered_json jsonb not null default '{}'::jsonb,
  last_layer_viewed integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, build_id)
);

create table if not exists public.build_remixes (
  id text primary key,
  original_build_id text not null references public.builds (id) on delete cascade,
  remixed_build_id text not null references public.builds (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (original_build_id, remixed_build_id)
);

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

create or replace function public.sync_build_favorite_count()
returns trigger
language plpgsql
as $$
declare
  target_build_id text;
begin
  target_build_id := coalesce(new.build_id, old.build_id);

  update public.builds
  set favorite_count = (
    select count(*)
    from public.favorites
    where build_id = target_build_id
  )
  where id = target_build_id;

  return null;
end;
$$;

drop trigger if exists set_build_timestamp on public.builds;
create trigger set_build_timestamp
before update on public.builds
for each row
execute function public.set_timestamp();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists on_auth_user_verified on auth.users;
create trigger on_auth_user_verified
after update on auth.users
for each row
execute function public.handle_verified_user();

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

update public.profiles
set special_tags_json = public.merge_profile_special_tags(
  public.get_manageable_profile_special_tags(special_tags_json),
  public.get_automatic_profile_special_tags(special_tags_json)
);

drop trigger if exists favorites_count_after_insert on public.favorites;
create trigger favorites_count_after_insert
after insert on public.favorites
for each row
execute function public.sync_build_favorite_count();

drop trigger if exists favorites_count_after_delete on public.favorites;
create trigger favorites_count_after_delete
after delete on public.favorites
for each row
execute function public.sync_build_favorite_count();

create index if not exists builds_user_id_idx on public.builds (user_id);
create index if not exists builds_published_idx on public.builds (is_published);
create index if not exists build_images_build_id_idx on public.build_images (build_id);
create index if not exists build_materials_build_id_idx on public.build_materials (build_id);
create index if not exists build_steps_build_id_idx on public.build_steps (build_id);
create index if not exists build_layers_build_id_idx on public.build_layers (build_id);
create index if not exists build_blocks_build_id_idx on public.build_blocks (build_id);
create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists build_progress_user_id_idx on public.build_progress (user_id);
create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at desc);

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

alter table public.profiles enable row level security;
alter table public.builds enable row level security;
alter table public.build_images enable row level security;
alter table public.build_materials enable row level security;
alter table public.build_steps enable row level security;
alter table public.build_layers enable row level security;
alter table public.build_blocks enable row level security;
alter table public.favorites enable row level security;
alter table public.build_progress enable row level security;
alter table public.build_remixes enable row level security;
alter table public.chat_messages enable row level security;

create policy "profiles public read"
on public.profiles
for select
using (true);

create policy "profiles owner insert"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles owner update"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "builds public read published or own"
on public.builds
for select
using (is_published or auth.uid() = user_id);

create policy "builds owner insert"
on public.builds
for insert
with check (auth.uid() = user_id);

create policy "builds owner update"
on public.builds
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

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

create policy "build images read with build access"
on public.build_images
for select
using (
  exists (
    select 1
    from public.builds
    where builds.id = build_images.build_id
      and (builds.is_published or builds.user_id = auth.uid())
  )
);

create policy "build images owner manage"
on public.build_images
for all
using (
  exists (
    select 1
    from public.builds
    where builds.id = build_images.build_id
      and builds.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.builds
    where builds.id = build_images.build_id
      and builds.user_id = auth.uid()
  )
);

create policy "build materials read with build access"
on public.build_materials
for select
using (
  exists (
    select 1
    from public.builds
    where builds.id = build_materials.build_id
      and (builds.is_published or builds.user_id = auth.uid())
  )
);

create policy "build materials owner manage"
on public.build_materials
for all
using (
  exists (
    select 1
    from public.builds
    where builds.id = build_materials.build_id
      and builds.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.builds
    where builds.id = build_materials.build_id
      and builds.user_id = auth.uid()
  )
);

create policy "build steps read with build access"
on public.build_steps
for select
using (
  exists (
    select 1
    from public.builds
    where builds.id = build_steps.build_id
      and (builds.is_published or builds.user_id = auth.uid())
  )
);

create policy "build steps owner manage"
on public.build_steps
for all
using (
  exists (
    select 1
    from public.builds
    where builds.id = build_steps.build_id
      and builds.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.builds
    where builds.id = build_steps.build_id
      and builds.user_id = auth.uid()
  )
);

create policy "build layers read with build access"
on public.build_layers
for select
using (
  exists (
    select 1
    from public.builds
    where builds.id = build_layers.build_id
      and (builds.is_published or builds.user_id = auth.uid())
  )
);

create policy "build layers owner manage"
on public.build_layers
for all
using (
  exists (
    select 1
    from public.builds
    where builds.id = build_layers.build_id
      and builds.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.builds
    where builds.id = build_layers.build_id
      and builds.user_id = auth.uid()
  )
);

create policy "build blocks read with build access"
on public.build_blocks
for select
using (
  exists (
    select 1
    from public.builds
    where builds.id = build_blocks.build_id
      and (builds.is_published or builds.user_id = auth.uid())
  )
);

create policy "build blocks owner manage"
on public.build_blocks
for all
using (
  exists (
    select 1
    from public.builds
    where builds.id = build_blocks.build_id
      and builds.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.builds
    where builds.id = build_blocks.build_id
      and builds.user_id = auth.uid()
  )
);

create policy "favorites owner read"
on public.favorites
for select
using (auth.uid() = user_id);

create policy "favorites owner insert"
on public.favorites
for insert
with check (auth.uid() = user_id);

create policy "favorites owner delete"
on public.favorites
for delete
using (auth.uid() = user_id);

create policy "progress owner read"
on public.build_progress
for select
using (auth.uid() = user_id);

create policy "progress owner insert"
on public.build_progress
for insert
with check (auth.uid() = user_id);

create policy "progress owner update"
on public.build_progress
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "remixes public read"
on public.build_remixes
for select
using (true);

create policy "remixes owner insert"
on public.build_remixes
for insert
with check (
  exists (
    select 1
    from public.builds
    where builds.id = remixed_build_id
      and builds.user_id = auth.uid()
  )
);

create policy "chat messages public read"
on public.chat_messages
for select
using (true);

create policy "chat messages owner insert"
on public.chat_messages
for insert
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values
  ('build-images', 'build-images', true),
  ('build-models', 'build-models', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "public image reads"
on storage.objects
for select
using (bucket_id in ('build-images', 'build-models', 'avatars'));

create policy "authenticated image uploads"
on storage.objects
for insert
with check (
  auth.role() = 'authenticated'
  and bucket_id in ('build-images', 'build-models', 'avatars')
);

create policy "owners update uploads"
on storage.objects
for update
using (
  auth.role() = 'authenticated'
  and owner = auth.uid()
  and bucket_id in ('build-images', 'build-models', 'avatars')
);

create policy "owners delete uploads"
on storage.objects
for delete
using (
  auth.role() = 'authenticated'
  and owner = auth.uid()
  and bucket_id in ('build-images', 'build-models', 'avatars')
);
