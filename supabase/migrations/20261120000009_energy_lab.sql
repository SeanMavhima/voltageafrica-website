-- ════════════════════════════════════════════════════════════════════
-- VoltageAfrica CMS · 009 · AI Energy Lab
--   /energy-lab  page with the interactive Energy Lab section (energy_lab)
--   navigation   "Energy Lab" in the header and footer, after "Microgrid"
--   technology   an "Open the AI Energy Lab" link under the intelligence console
--
-- Safe to re-run: fixed IDs and "on conflict do nothing"; menus are only
-- reordered on the run that adds the new links; the Technology link is only
-- added if the section has none yet. Nothing is deleted or overwritten.
-- ════════════════════════════════════════════════════════════════════
begin;

insert into public.pages (id, slug, title, seo_title, seo_description, status, is_system, sort_order) values
  ('27e84d58-5765-5bd3-b317-d34fbbb13a58', 'energy-lab', 'AI Energy Lab', 'AI Energy Lab', 'VoltageAfrica''s AI Energy Lab: an interactive, simulated community microgrid. Explore energy flows, run what-if scenarios, compare intelligent management with an uncontrolled system, and ask the energy copilot. All data is simulated.', 'published', true, 13)
on conflict do nothing;

insert into public.page_sections (id, page_id, type, label, content, settings, status, is_visible, sort_order)
select 'fc230a59-6972-5cd7-997b-77c213e8b699'::uuid, '27e84d58-5765-5bd3-b317-d34fbbb13a58'::uuid, 'energy_lab', null, '{"kicker":"VoltageAfrica AI Energy Lab","headline":"Intelligent energy. *Simulated, explored, explained.*","intro":"Step inside a simulated community microgrid. Change the weather, the equipment and the community''s demand, then watch how an intelligent energy manager decides what to supply, when, and what to protect, and why.","paused":false,"pausedMessage":"The Energy Lab is being updated and will be back shortly.","disclaimer":"Everything in the Energy Lab is a simulation of a conceptual hub. VoltageAfrica does not yet operate a microgrid, and nothing here is live data, a field measurement or a validated forecast. The lab does not control any equipment.","features":[{"title":"A real simulator","body":"Sun position, weather, temperature, battery efficiencies and eleven community loads, every 15 minutes."},{"title":"An optimiser","body":"Schedules pumping and milling into solar surplus and protects a reserve for the clinic."},{"title":"A copilot","body":"Explains the system and runs what-if simulations, grounded in the simulator''s own numbers."}],"defaultPreset":"sunny","defaultLevel":"explore","presets":[],"households":60,"solarKwp":30,"batteryKwh":80,"reservePct":25,"education":[{"title":"Why a battery reserve?","body":"Without load management, an empty battery switches off the whole village at once, the clinic included. Holding back a reserve that only critical services may use keeps the vaccine fridge and the lights on when everything else must wait."},{"title":"Why move the mill?","body":"Solar power is free at midday and expensive at night, because night-time energy has to pass through the battery, losing about 10% and wearing it out. Running flexible machines in the sun saves the battery for the evening."},{"title":"What intelligence cannot do","body":"Scheduling and prioritisation decide who gets the energy. They cannot create it. When demand exceeds what the sun and the battery can supply, the lab says so and shows what equipment would close the gap."}],"copilotOff":false,"copilotIntro":"Ask anything about the scenario on screen. The copilot reads the simulator''s numbers (generation, demand, battery, the optimiser''s recommendations, the forecast) and can run new what-if simulations. If the data cannot answer a question, it says so.","suggestedQuestions":["Why is the battery discharging?","What happens if it is cloudy for three days?","Can the system support 20 additional households?","What should we run during the solar peak?","Compare the baseline with the optimised system.","Explain this system to a non-engineer."]}'::jsonb, '{}'::jsonb, 'published', true, 0
where exists (select 1 from public.pages where id = '27e84d58-5765-5bd3-b317-d34fbbb13a58'::uuid)
on conflict (id) do nothing;

-- Make room after "Microgrid" (first run only), then add the links.
update public.navigation_items set sort_order = sort_order + 1
  where location = 'header' and parent_id is null and sort_order >= 3
    and not exists (select 1 from public.navigation_items where id = '76f4cbb1-93dd-5e22-b0a4-b6e44c0bb2da'::uuid);
insert into public.navigation_items (id, is_external, is_visible, parent_id, label, href, location, sort_order) values
  ('76f4cbb1-93dd-5e22-b0a4-b6e44c0bb2da', false, true, null, 'Energy Lab', '/energy-lab', 'header', 3)
on conflict (id) do nothing;
update public.navigation_items set sort_order = sort_order + 1
  where location = 'footer' and parent_id is null and sort_order >= 3
    and not exists (select 1 from public.navigation_items where id = '7f5cda9d-d204-5a2a-a4a6-b8572229d7e6'::uuid);
insert into public.navigation_items (id, is_external, is_visible, parent_id, label, href, location, sort_order) values
  ('7f5cda9d-d204-5a2a-a4a6-b8572229d7e6', false, true, null, 'Energy Lab', '/energy-lab', 'footer', 3)
on conflict (id) do nothing;

-- Technology page: link from the intelligence console to the lab (only if none is set).
update public.page_sections
  set content = content || jsonb_build_object('labCta', '{"label":"Open the AI Energy Lab","href":"/energy-lab"}'::jsonb)
  where id = 'e2c10497-9bcb-5ae0-92c4-8c4c0f5f21e7'::uuid and not (content ? 'labCta');

commit;
