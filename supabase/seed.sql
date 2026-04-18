-- Replace the UUID below with a real auth.users id from your Supabase project.
-- Then run this file after schema.sql if you want one published demo build in the database.

insert into public.profiles (id, username, display_name, bio, avatar_url)
values (
  '00000000-0000-0000-0000-000000000000',
  'seedbuilder',
  'Seed Builder',
  'Starter profile for PokoBuild3D demo content.',
  ''
)
on conflict (id) do update
set
  username = excluded.username,
  display_name = excluded.display_name,
  bio = excluded.bio;

insert into public.builds (
  id,
  user_id,
  slug,
  title,
  description,
  biome,
  difficulty,
  tags,
  thumbnail_url,
  model_type,
  is_published
)
values (
  'build-seed-garden-lattice',
  '00000000-0000-0000-0000-000000000000',
  'seed-garden-lattice',
  'Seed garden lattice',
  'Simple starter build inserted from SQL.',
  'garden',
  'easy',
  array['garden', 'decor', 'beginner'],
  '',
  'editor',
  true
)
on conflict (id) do nothing;

insert into public.build_layers (id, build_id, layer_index, layer_name, note)
values
  ('layer-seed-0', 'build-seed-garden-lattice', 0, 'Footing', 'Lay the base supports.'),
  ('layer-seed-1', 'build-seed-garden-lattice', 1, 'Frame', 'Raise the side frame.'),
  ('layer-seed-2', 'build-seed-garden-lattice', 2, 'Top span', 'Bridge the top with planks.')
on conflict (id) do nothing;

insert into public.build_materials (id, build_id, item_name, qty_required, note, sort_order)
values
  ('material-seed-0', 'build-seed-garden-lattice', 'Mosswood cube block', 8, 'Base supports', 0),
  ('material-seed-1', 'build-seed-garden-lattice', 'Pine plank block', 3, 'Top span', 1),
  ('material-seed-2', 'build-seed-garden-lattice', 'Cream ladder panel', 2, 'Side detailing', 2)
on conflict (id) do nothing;
