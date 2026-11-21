-- ════════════════════════════════════════════════════════════════════
-- VoltageAfrica CMS · 005 · Page imagery
-- Adds photo plates (large editorial photographs) to the page openings and
-- the Partner, Support and Contact pages.
--
-- Non-destructive and safe to re-run:
--   • new media-library rows use fixed IDs and "on conflict do nothing"
--   • a photo is only filled in where the section has NO image yet, so a
--     photo you chose or removed later in the CMS is never overwritten
--     (unless you cleared it, and then re-run this file)
-- ════════════════════════════════════════════════════════════════════
begin;

-- New photographs in the media library (served from /public/images)
insert into public.media_assets (id, bucket, path, file_name, alt_text, caption, mime_type, category) values
  ('0f2d8eb6-a385-5ce3-a333-c0000614f073', 'static', '/images/outreach/kigali-lesson-group.jpg', 'kigali-lesson-group.jpg', 'Secondary-school students standing with the VoltageAfrica team in front of a projected slide reading ''We need to treat Earth with respect''', 'A renewable energy and conservation lesson with secondary-school students in Kigali, Rwanda.', 'image/jpeg', 'outreach'),
  ('832709ee-0938-5546-a656-1d4d78197041', 'static', '/images/outreach/kigali-courtyard.jpg', 'kigali-courtyard.jpg', 'Students and teachers gathered outside a brick school building in Kigali after a VoltageAfrica lesson', 'Students and teachers after a VoltageAfrica climate education session in Kigali, Rwanda.', 'image/jpeg', 'outreach'),
  ('bf957e5e-65d4-577b-adcc-317dd0fa6439', 'static', '/images/milestones/green-generation-team.jpg', 'green-generation-team.jpg', 'Four young people in Green Generation Initiative t-shirts holding tree seedlings in a forest clearing', 'Tree planting with the Green Generation Initiative.', 'image/jpeg', 'timeline')
on conflict (id) do nothing;

-- page_intro · Our vision
update public.page_sections set content = content || '{"image":{"id":"0f2d8eb6-a385-5ce3-a333-c0000614f073","src":"/images/outreach/kigali-lesson-group.jpg","alt":"Secondary-school students standing with the VoltageAfrica team in front of a projected slide reading ''We need to treat Earth with respect''"},"imageCaption":"A VoltageAfrica renewable energy and conservation lesson with secondary-school students in Kigali, Rwanda.","imagePosition":"50% 45%"}'::jsonb
  where id = 'd2b33548-6060-505f-b654-b5641b6ff0f2' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;
update public.page_section_drafts set content = content || '{"image":{"id":"0f2d8eb6-a385-5ce3-a333-c0000614f073","src":"/images/outreach/kigali-lesson-group.jpg","alt":"Secondary-school students standing with the VoltageAfrica team in front of a projected slide reading ''We need to treat Earth with respect''"},"imageCaption":"A VoltageAfrica renewable energy and conservation lesson with secondary-school students in Kigali, Rwanda.","imagePosition":"50% 45%"}'::jsonb
  where section_id = 'd2b33548-6060-505f-b654-b5641b6ff0f2' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;

-- page_intro · Technology
update public.page_sections set content = content || '{"image":{"id":"e24fa183-d39e-5832-a4ec-963c2187bdc4","src":"/images/prototype/tracker-array.jpg","alt":"VoltageAfrica''s prototype: four solar modules arranged around a central light-sensor module"},"imageCaption":"VoltageAfrica’s sun-tracking prototype, 2025: four 15 W solar modules steered by a central light sensor.","imagePosition":"50% 55%"}'::jsonb
  where id = '65ec905b-faba-5de0-a362-331802f173c6' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;
update public.page_section_drafts set content = content || '{"image":{"id":"e24fa183-d39e-5832-a4ec-963c2187bdc4","src":"/images/prototype/tracker-array.jpg","alt":"VoltageAfrica''s prototype: four solar modules arranged around a central light-sensor module"},"imageCaption":"VoltageAfrica’s sun-tracking prototype, 2025: four 15 W solar modules steered by a central light sensor.","imagePosition":"50% 55%"}'::jsonb
  where section_id = '65ec905b-faba-5de0-a362-331802f173c6' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;

-- page_intro · About
update public.page_sections set content = content || '{"image":{"id":"bf957e5e-65d4-577b-adcc-317dd0fa6439","src":"/images/milestones/green-generation-team.jpg","alt":"Four young people in Green Generation Initiative t-shirts holding tree seedlings in a forest clearing"},"imageCaption":"Tree planting with the Green Generation Initiative. Energy access and environmental care go together.","imagePosition":"50% 35%"}'::jsonb
  where id = '67e7a96f-10bd-5061-9ca9-8ac0f33c75ce' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;
update public.page_section_drafts set content = content || '{"image":{"id":"bf957e5e-65d4-577b-adcc-317dd0fa6439","src":"/images/milestones/green-generation-team.jpg","alt":"Four young people in Green Generation Initiative t-shirts holding tree seedlings in a forest clearing"},"imageCaption":"Tree planting with the Green Generation Initiative. Energy access and environmental care go together.","imagePosition":"50% 35%"}'::jsonb
  where section_id = '67e7a96f-10bd-5061-9ca9-8ac0f33c75ce' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;

-- contact · Contact & partnerships
update public.page_sections set content = content || '{"image":{"id":"9312dba9-831c-5676-a6ce-340875d38954","src":"/images/founder/sean-field.jpg","alt":"Sean Mavhima planting a tree in dense green bush"},"imageCaption":"Sean Mavhima, founder of VoltageAfrica, in the field.","imagePosition":"50% 40%"}'::jsonb
  where id = '672e101d-6b08-53bd-b99e-cd2cfe8d5d8e' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;
update public.page_section_drafts set content = content || '{"image":{"id":"9312dba9-831c-5676-a6ce-340875d38954","src":"/images/founder/sean-field.jpg","alt":"Sean Mavhima planting a tree in dense green bush"},"imageCaption":"Sean Mavhima, founder of VoltageAfrica, in the field.","imagePosition":"50% 40%"}'::jsonb
  where section_id = '672e101d-6b08-53bd-b99e-cd2cfe8d5d8e' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;

-- partnership · Partner with VoltageAfrica
update public.page_sections set content = content || '{"image":{"id":"67b9c468-458b-588e-ac42-5e144ccd6db3","src":"/images/milestones/brics-summit-pretoria.jpg","alt":"Sean Mavhima with delegates at the BRICS+ Youth Innovation Summit in Pretoria, South Africa"},"imageCaption":"Sean Mavhima with delegates at the BRICS+ Youth Innovation Summit, Pretoria, South Africa, April 2026.","imagePosition":"50% 30%"}'::jsonb
  where id = 'dac75cbf-d58e-50c7-af4e-30451f139c8d' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;
update public.page_section_drafts set content = content || '{"image":{"id":"67b9c468-458b-588e-ac42-5e144ccd6db3","src":"/images/milestones/brics-summit-pretoria.jpg","alt":"Sean Mavhima with delegates at the BRICS+ Youth Innovation Summit in Pretoria, South Africa"},"imageCaption":"Sean Mavhima with delegates at the BRICS+ Youth Innovation Summit, Pretoria, South Africa, April 2026.","imagePosition":"50% 30%"}'::jsonb
  where section_id = 'dac75cbf-d58e-50c7-af4e-30451f139c8d' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;

-- support · Support VoltageAfrica
update public.page_sections set content = content || '{"image":{"id":"832709ee-0938-5546-a656-1d4d78197041","src":"/images/outreach/kigali-courtyard.jpg","alt":"Students and teachers gathered outside a brick school building in Kigali after a VoltageAfrica lesson"},"imageCaption":"Students and teachers after a VoltageAfrica climate education session in Kigali, Rwanda. Community energy education is one of the areas support makes possible.","imagePosition":"50% 72%"}'::jsonb
  where id = 'ffe0e852-233e-5128-bf75-7d98a73d4963' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;
update public.page_section_drafts set content = content || '{"image":{"id":"832709ee-0938-5546-a656-1d4d78197041","src":"/images/outreach/kigali-courtyard.jpg","alt":"Students and teachers gathered outside a brick school building in Kigali after a VoltageAfrica lesson"},"imageCaption":"Students and teachers after a VoltageAfrica climate education session in Kigali, Rwanda. Community energy education is one of the areas support makes possible.","imagePosition":"50% 72%"}'::jsonb
  where section_id = 'ffe0e852-233e-5128-bf75-7d98a73d4963' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;

-- page_intro · Projects
update public.page_sections set content = content || '{"image":{"id":"c136d01c-ecd0-5093-b2b0-b0cb0e7d46f7","src":"/images/prototype/modules-side.jpg","alt":"Prototype solar modules seen from the side"},"imageCaption":"Prototype solar modules under test, 2025. Each project starts with something we can build and measure.","imagePosition":"50% 50%"}'::jsonb
  where id = 'e75af25f-fbae-5fef-bfe1-a321e2bdf17c' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;
update public.page_section_drafts set content = content || '{"image":{"id":"c136d01c-ecd0-5093-b2b0-b0cb0e7d46f7","src":"/images/prototype/modules-side.jpg","alt":"Prototype solar modules seen from the side"},"imageCaption":"Prototype solar modules under test, 2025. Each project starts with something we can build and measure.","imagePosition":"50% 50%"}'::jsonb
  where section_id = 'e75af25f-fbae-5fef-bfe1-a321e2bdf17c' and coalesce(content -> 'image', 'null'::jsonb) = 'null'::jsonb;

commit;
