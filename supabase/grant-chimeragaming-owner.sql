update public.profiles
set
  username = '@chimeragaming',
  special_tags_json = (
    select coalesce(jsonb_agg(tag order by tag), '[]'::jsonb)
    from (
      select distinct value as tag
      from jsonb_array_elements_text(
        coalesce(public.profiles.special_tags_json, '[]'::jsonb) || '["Owner"]'::jsonb
      )
    ) as tags
  )
where lower(username) in ('@chimeragaming', 'chimeragaming');
