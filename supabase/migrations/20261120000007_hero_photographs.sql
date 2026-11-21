-- ════════════════════════════════════════════════════════════════════
-- VoltageAfrica CMS · 007 · Hero film: real photographs for scenes 3–5
-- The energy      → a solar mini-grid in Bayelsa, Nigeria
-- The intelligence → battery storage under computer control, Schwerin
-- The future      → golden sunset in Kawempe, Kampala, Uganda
-- All three: Wikimedia Commons, CC BY-SA 4.0, credited in captions and the
-- footer. None is presented as a VoltageAfrica installation.
--
-- Safe to re-run: media use fixed IDs; a scene is only replaced while it still
-- shows its original image, so scenes changed in the CMS are left alone.
-- ════════════════════════════════════════════════════════════════════
begin;

insert into public.media_assets (id, bucket, path, file_name, alt_text, caption, credit_author, credit_license, credit_license_url, credit_source, mime_type, category) values
  ('fcba3f86-e401-563f-bced-08d57df88df7', 'static', '/images/commons/mini-grid-bayelsa.jpg', 'mini-grid-bayelsa.jpg', 'Aerial view of a fenced solar mini-grid with rows of panels and a small power house, beside forest, a river and a town in Bayelsa, Nigeria', 'A solar mini-grid serving a community in Bayelsa, Nigeria', 'Rupumped', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:Mini-Grid_Bayelsa.jpg', 'image/jpeg', 'commons'),
  ('02540fe5-f430-5c65-b686-24dce1be83a6', 'static', '/images/commons/battery-storage-schwerin.jpg', 'battery-storage-schwerin.jpg', 'Long aisles of battery racks and control cabinets inside the WEMAG battery storage hall in Schwerin, Germany', 'Battery racks under continuous computer control at the WEMAG storage plant, Schwerin, Germany', 'Enyavar', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:Schwerin_20140923_wemag2.jpg', 'image/jpeg', 'commons'),
  ('65fa27c4-697d-5cc2-90ea-930dfb71eeaf', 'static', '/images/commons/golden-sunset-kampala.jpg', 'golden-sunset-kampala.jpg', 'The sun setting behind the silhouette of a great spreading tree, with warm golden light, in Kawempe, Kampala, Uganda', 'Golden sunset in Kawempe, Kampala, Uganda', 'Rudian kd', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://commons.wikimedia.org/wiki/File:A_striking_Golden_sunset_happens.jpg', 'image/jpeg', 'commons')
on conflict (id) do nothing;

update public.page_sections set content = jsonb_set(content, '{scenes,2}', '{"image":{"id":"fcba3f86-e401-563f-bced-08d57df88df7","src":"/images/commons/mini-grid-bayelsa.jpg","alt":"Aerial view of a fenced solar mini-grid with rows of panels and a small power house, beside forest, a river and a town in Bayelsa, Nigeria"},"title":"The energy","caption":"A solar mini-grid serving a community in Bayelsa, Nigeria. Not a VoltageAfrica installation.","position":"66% 66%","motion":"left"}'::jsonb)
  where id = '23fbf37c-1176-59e3-b0a8-a8de2cd7614f' and content -> 'scenes' -> 2 -> 'image' ->> 'src' = '/images/renders/hub-golden.jpg';
update public.page_section_drafts set content = jsonb_set(content, '{scenes,2}', '{"image":{"id":"fcba3f86-e401-563f-bced-08d57df88df7","src":"/images/commons/mini-grid-bayelsa.jpg","alt":"Aerial view of a fenced solar mini-grid with rows of panels and a small power house, beside forest, a river and a town in Bayelsa, Nigeria"},"title":"The energy","caption":"A solar mini-grid serving a community in Bayelsa, Nigeria. Not a VoltageAfrica installation.","position":"66% 66%","motion":"left"}'::jsonb)
  where section_id = '23fbf37c-1176-59e3-b0a8-a8de2cd7614f' and content -> 'scenes' -> 2 -> 'image' ->> 'src' = '/images/renders/hub-golden.jpg';
update public.page_sections set content = jsonb_set(content, '{scenes,3}', '{"image":{"id":"02540fe5-f430-5c65-b686-24dce1be83a6","src":"/images/commons/battery-storage-schwerin.jpg","alt":"Long aisles of battery racks and control cabinets inside the WEMAG battery storage hall in Schwerin, Germany"},"title":"The intelligence","caption":"Battery racks under continuous computer control at the WEMAG storage plant, Schwerin, Germany. Not a VoltageAfrica installation.","position":"50% 50%","motion":"in"}'::jsonb)
  where id = '23fbf37c-1176-59e3-b0a8-a8de2cd7614f' and content -> 'scenes' -> 3 -> 'image' ->> 'src' = '/images/prototype/tracker-sensor.jpg';
update public.page_section_drafts set content = jsonb_set(content, '{scenes,3}', '{"image":{"id":"02540fe5-f430-5c65-b686-24dce1be83a6","src":"/images/commons/battery-storage-schwerin.jpg","alt":"Long aisles of battery racks and control cabinets inside the WEMAG battery storage hall in Schwerin, Germany"},"title":"The intelligence","caption":"Battery racks under continuous computer control at the WEMAG storage plant, Schwerin, Germany. Not a VoltageAfrica installation.","position":"50% 50%","motion":"in"}'::jsonb)
  where section_id = '23fbf37c-1176-59e3-b0a8-a8de2cd7614f' and content -> 'scenes' -> 3 -> 'image' ->> 'src' = '/images/prototype/tracker-sensor.jpg';
update public.page_sections set content = jsonb_set(content, '{scenes,4}', '{"image":{"id":"65fa27c4-697d-5cc2-90ea-930dfb71eeaf","src":"/images/commons/golden-sunset-kampala.jpg","alt":"The sun setting behind the silhouette of a great spreading tree, with warm golden light, in Kawempe, Kampala, Uganda"},"title":"The future","caption":"Golden sunset in Kawempe, Kampala, Uganda.","position":"56% 52%","motion":"out"}'::jsonb)
  where id = '23fbf37c-1176-59e3-b0a8-a8de2cd7614f' and content -> 'scenes' -> 4 -> 'image' ->> 'src' = '/images/renders/hub-dusk.jpg';
update public.page_section_drafts set content = jsonb_set(content, '{scenes,4}', '{"image":{"id":"65fa27c4-697d-5cc2-90ea-930dfb71eeaf","src":"/images/commons/golden-sunset-kampala.jpg","alt":"The sun setting behind the silhouette of a great spreading tree, with warm golden light, in Kawempe, Kampala, Uganda"},"title":"The future","caption":"Golden sunset in Kawempe, Kampala, Uganda.","position":"56% 52%","motion":"out"}'::jsonb)
  where section_id = '23fbf37c-1176-59e3-b0a8-a8de2cd7614f' and content -> 'scenes' -> 4 -> 'image' ->> 'src' = '/images/renders/hub-dusk.jpg';

commit;
