-- ════════════════════════════════════════════════════════════════════
-- VoltageAfrica CMS · 010 · Donate / fund the pilot
--   /support   a "donate" band (anchor #donate) above the support-inquiry
--              form. The header "Donate" button links to /support#donate.
--
-- The band ships without figures or a payment link: until an editor adds
-- a payment page link (Admin → Pages → Support → Donate), its button reads
-- "Pledge your support" and opens the support form. The goal bar and gift
-- tiers stay hidden until real numbers are entered.
--
-- Safe to re-run: fixed ID and "on conflict do nothing"; existing sections
-- are only moved down on the run that adds the band. Nothing is deleted.
-- ════════════════════════════════════════════════════════════════════
begin;

update public.page_sections set sort_order = sort_order + 1
  where page_id = 'a47afd98-427b-5847-a284-c50905ae7ba8'::uuid
    and not exists (select 1 from public.page_sections where id = 'fca17965-4197-51a5-a8c7-52ccec9714d9'::uuid);

insert into public.page_sections (id, page_id, type, label, content, settings, status, is_visible, sort_order)
select 'fca17965-4197-51a5-a8c7-52ccec9714d9'::uuid, 'a47afd98-427b-5847-a284-c50905ae7ba8'::uuid, 'donate', null, '{"kicker":"Fund the pilot","headline":"Help switch on *Shurugwi''s first community grid.*","intro":"VoltageAfrica is preparing its first solar microgrid hub in Shurugwi, Zimbabwe, for villages the national grid has not reached. Contributions go toward the pilot: equipment, installation and the community work around it.","donateLabel":"Donate","pledgeLabel":"Pledge your support","otherWaysLabel":"Equipment, expertise or partnership","methodsNote":"","goalLabel":"toward the Shurugwi pilot hub","tiersTitle":"What your gift makes possible","trustTitle":"Where the money goes","trustNote":"Every contribution is used for VoltageAfrica''s pilot and the research behind it. We report progress publicly on this site as the hub moves from preparation to construction.","noLinkNote":"Online giving opens soon. Pledge now and we will contact you personally with how to give."}'::jsonb, '{"anchor":"donate"}'::jsonb, 'published', true, 0
where exists (select 1 from public.pages where id = 'a47afd98-427b-5847-a284-c50905ae7ba8'::uuid)
on conflict (id) do nothing;

commit;
