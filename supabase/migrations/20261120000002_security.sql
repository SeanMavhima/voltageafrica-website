-- ════════════════════════════════════════════════════════════════════
-- VoltageAfrica CMS · 002 · Security
-- Row Level Security on every table, explicit policies, admin check.
--
-- Model
--   anon / authenticated (non-admin) → read published, public content only
--   administrators (row in public.profiles) → full content management
--   contact_messages → administrators only; inserted server-side with the
--                      service role (which bypasses RLS) after validation
-- ════════════════════════════════════════════════════════════════════

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('admin', 'editor')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Enable RLS everywhere
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'media_assets', 'site_settings', 'pages', 'page_sections', 'page_section_drafts',
    'timeline_milestones', 'publications', 'awards', 'projects', 'project_gallery',
    'project_milestones', 'project_publications', 'technology_items', 'principles', 'people',
    'navigation_items', 'contact_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Drop policies so this migration can be re-run safely
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ─── profiles ────────────────────────────────────────────────────────
create policy "profiles: read own or as admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
-- No insert/update/delete policies: administrators are provisioned through
-- the documented SQL / service-role process only. There is no self sign-up path.

-- ─── Published-content collections ───────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['timeline_milestones', 'publications', 'awards', 'projects', 'technology_items', 'principles', 'people'] loop
    execute format($f$
      create policy "%1$s: public reads published" on public.%1$I
        for select to anon, authenticated
        using (status = 'published' or (select public.is_admin()))
    $f$, t);
    execute format($f$
      create policy "%1$s: admins insert" on public.%1$I
        for insert to authenticated with check ((select public.is_admin()))
    $f$, t);
    execute format($f$
      create policy "%1$s: admins update" on public.%1$I
        for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))
    $f$, t);
    execute format($f$
      create policy "%1$s: admins delete" on public.%1$I
        for delete to authenticated using ((select public.is_admin()))
    $f$, t);
  end loop;
end $$;

-- ─── Project relations: visible when the project is published ────────
do $$
declare t text;
begin
  foreach t in array array['project_gallery', 'project_milestones', 'project_publications'] loop
    execute format($f$
      create policy "%1$s: public reads for published projects" on public.%1$I
        for select to anon, authenticated
        using (
          (select public.is_admin())
          or exists (select 1 from public.projects p where p.id = project_id and p.status = 'published')
        )
    $f$, t);
    execute format($f$
      create policy "%1$s: admins write" on public.%1$I
        for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))
    $f$, t);
  end loop;
end $$;

-- ─── pages ───────────────────────────────────────────────────────────
create policy "pages: public reads published" on public.pages
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy "pages: admins write" on public.pages
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ─── page_sections: published, visible, on a published page ──────────
create policy "page_sections: public reads live sections" on public.page_sections
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or (
      status = 'published' and is_visible
      and exists (select 1 from public.pages p where p.id = page_id and p.status = 'published')
    )
  );
create policy "page_sections: admins write" on public.page_sections
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ─── page_section_drafts: administrators only ────────────────────────
create policy "drafts: admins only" on public.page_section_drafts
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ─── media_assets: public metadata except the private bucket ─────────
create policy "media: public reads non-private" on public.media_assets
  for select to anon, authenticated
  using (bucket <> 'private' or (select public.is_admin()));
create policy "media: admins write" on public.media_assets
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ─── site_settings: public read, admin update ────────────────────────
create policy "settings: public read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "settings: admins update" on public.site_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "settings: admins insert" on public.site_settings
  for insert to authenticated with check ((select public.is_admin()));

-- ─── navigation_items: public reads visible links ────────────────────
create policy "navigation: public reads visible" on public.navigation_items
  for select to anon, authenticated
  using (is_visible or (select public.is_admin()));
create policy "navigation: admins write" on public.navigation_items
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ─── contact_messages: administrators only (read/update/delete) ──────
create policy "messages: admins read" on public.contact_messages
  for select to authenticated using ((select public.is_admin()));
create policy "messages: admins update" on public.contact_messages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "messages: admins delete" on public.contact_messages
  for delete to authenticated using ((select public.is_admin()));
-- Deliberately no insert policy: the public cannot write messages directly.
-- /api/contact validates, rate-limits, then inserts with the service role.

-- ─── Recent edits (dashboard) — respects RLS of the underlying tables ─
create or replace view public.admin_recent_edits
with (security_invoker = true) as
  select 'page' as entity, id, title as label, updated_at, status::text as status from public.pages
  union all select 'section', s.id, coalesce(s.label, s.type), greatest(s.updated_at, coalesce(d.updated_at, s.updated_at)),
         case when d.section_id is not null then 'draft changes' else s.status::text end
    from public.page_sections s left join public.page_section_drafts d on d.section_id = s.id
  union all select 'milestone', id, title, updated_at, status::text from public.timeline_milestones
  union all select 'publication', id, headline, updated_at, status::text from public.publications
  union all select 'award', id, title, updated_at, status::text from public.awards
  union all select 'project', id, name, updated_at, status::text from public.projects
  union all select 'technology', id, title, updated_at, status::text from public.technology_items
  union all select 'principle', id, title, updated_at, status::text from public.principles
  union all select 'person', id, name, updated_at, status::text from public.people
  union all select 'media', id, coalesce(title, file_name), updated_at, bucket from public.media_assets;

revoke all on public.admin_recent_edits from anon;
grant select on public.admin_recent_edits to authenticated;
