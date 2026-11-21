-- ════════════════════════════════════════════════════════════════════
-- VoltageAfrica CMS · 011 · Privacy policy: theme preference
--   The site now remembers the visitor's light/dark theme choice in the
--   browser (localStorage). The cookies paragraph of the privacy policy is
--   updated to say so.
--
-- Only replaces the original, unedited sentence: if an editor has changed
-- that paragraph in the CMS, nothing is touched. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════
begin;

update public.page_sections
  set content = jsonb_set(content, '{body}', to_jsonb(replace(content->>'body', 'Your browser remembers two small preferences for the length of your visit: whether you chose the film or the 3D view on the homepage, and whether you have already seen its opening animation.', 'Your browser remembers a few small preferences on your own device: whether you chose the film or the 3D view on the homepage and whether you have already seen its opening animation (both for the length of your visit), and whether you chose the light or dark theme (kept until you change it or clear your browser data). None of these are sent to us.')))
  where type = 'rich_text'
    and page_id = (select id from public.pages where slug = 'privacy')
    and position('Your browser remembers two small preferences for the length of your visit: whether you chose the film or the 3D view on the homepage, and whether you have already seen its opening animation.' in coalesce(content->>'body', '')) > 0;

commit;
