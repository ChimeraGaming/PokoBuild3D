alter table public.builds
add column if not exists asset_kind text not null default 'model';

alter table public.builds
add column if not exists model_source text not null default 'editor';

alter table public.builds
add column if not exists resource_links_json jsonb not null default '[]'::jsonb;
