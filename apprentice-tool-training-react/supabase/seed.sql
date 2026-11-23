insert into public.tool_families (name, description)
values
  ('Screwdrivers', 'Screw-driving and related hand tools'),
  ('Pliers', 'Gripping and cutting pliers'),
  ('Wrenches', 'Wrenches and related turning tools')
on conflict (name) do nothing;
