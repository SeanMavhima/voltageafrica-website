-- ════════════════════════════════════════════════════════════════════
-- VoltageAfrica CMS · 001 · Schema
-- Tables, enums, indexes and updated_at triggers.
-- Row Level Security and grants are defined in 002_security.sql.
-- ════════════════════════════════════════════════════════════════════


do $$ begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_status as enum ('new', 'read', 'responded', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.admin_role as enum ('admin', 'editor');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Administrators ──────────────────────────────────────────────────
-- A row here is what makes an authenticated user an administrator.
-- Rows are created by the documented setup process, never by sign-up.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.admin_role not null default 'editor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Media library ───────────────────────────────────────────────────
-- bucket 'media'   → public Supabase Storage bucket
-- bucket 'private' → private Supabase Storage bucket (admin only)
-- bucket 'static'  → files shipped with the site under /public (seeded)
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media' check (bucket in ('media', 'private', 'static')),
  path text not null,
  file_name text not null,
  title text,
  alt_text text not null default '',
  description text,
  caption text,
  credit_author text,
  credit_license text,
  credit_license_url text,
  credit_source text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  category text not null default 'general',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path)
);
create index if not exists media_assets_category_idx on public.media_assets (category);
create index if not exists media_assets_mime_idx on public.media_assets (mime_type);
create index if not exists media_assets_created_idx on public.media_assets (created_at desc);

-- ─── Site settings (single row) ──────────────────────────────────────
create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  site_name text not null default 'VoltageAfrica',
  tagline text not null default '',
  description text not null default '',
  contact_email text,
  social_links jsonb not null default '[]'::jsonb,
  footer_statement text not null default '',
  footer_copyright text not null default '',
  footer_regions text not null default '',
  nav_cta_label text not null default 'Get in touch',
  nav_cta_href text not null default '/contact',
  default_seo_title text not null default '',
  default_seo_description text not null default '',
  og_image_id uuid references public.media_assets (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint social_links_is_array check (jsonb_typeof(social_links) = 'array')
);

-- ─── Pages & page builder ────────────────────────────────────────────
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  seo_title text,
  seo_description text,
  og_image_id uuid references public.media_assets (id) on delete set null,
  status public.content_status not null default 'draft',
  is_system boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pages_status_idx on public.pages (status);

create table if not exists public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  type text not null check (type ~ '^[a-z_]+$'),
  label text,
  content jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'draft',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_is_object check (jsonb_typeof(content) = 'object'),
  constraint settings_is_object check (jsonb_typeof(settings) = 'object')
);
create index if not exists page_sections_page_order_idx on public.page_sections (page_id, sort_order);

-- Unpublished edits live here, in an admin-only table, so a draft can
-- never be read through the public API by accident.
create table if not exists public.page_section_drafts (
  section_id uuid primary key references public.page_sections (id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ─── Collections ─────────────────────────────────────────────────────
create table if not exists public.timeline_milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  date_label text not null,
  description text not null default '',
  category text not null default 'Build',
  image_id uuid references public.media_assets (id) on delete set null,
  image_position text,
  link_url text,
  link_label text,
  is_upcoming boolean not null default false,
  featured boolean not null default false,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists timeline_status_order_idx on public.timeline_milestones (status, sort_order);

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  outlet text not null,
  headline text not null,
  published_on date,
  date_label text not null default '',
  url text not null,
  description text not null default '',
  category text not null default 'News',
  cover_image_id uuid references public.media_assets (id) on delete set null,
  featured boolean not null default false,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists publications_status_order_idx on public.publications (status, sort_order);

create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organisation text not null,
  award_date date,
  date_label text not null default '',
  location text,
  description text not null default '',
  image_id uuid references public.media_assets (id) on delete set null,
  url text,
  featured boolean not null default false,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists awards_status_order_idx on public.awards (status, sort_order);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text not null default '',
  body text not null default '',
  stage text not null default 'Concept',
  location text,
  cover_image_id uuid references public.media_assets (id) on delete set null,
  categories text[] not null default '{}',
  featured boolean not null default false,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_gallery (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  media_id uuid not null references public.media_assets (id) on delete cascade,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, media_id)
);

create table if not exists public.project_milestones (
  project_id uuid not null references public.projects (id) on delete cascade,
  milestone_id uuid not null references public.timeline_milestones (id) on delete cascade,
  primary key (project_id, milestone_id)
);

create table if not exists public.project_publications (
  project_id uuid not null references public.projects (id) on delete cascade,
  publication_id uuid not null references public.publications (id) on delete cascade,
  primary key (project_id, publication_id)
);

-- kind: approach_step · capability · productive_use · microgrid_component
create table if not exists public.technology_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('approach_step', 'capability', 'productive_use', 'microgrid_component')),
  key text not null check (key ~ '^[a-z0-9_-]+$'),
  title text not null,
  kicker text,
  body text not null default '',
  points text[] not null default '{}',
  status_label text,
  note text,
  enables text,
  image_id uuid references public.media_assets (id) on delete set null,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, key)
);

create table if not exists public.principles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  country text,
  bio text not null default '',
  quote text,
  quote_source_label text,
  quote_source_url text,
  image_id uuid references public.media_assets (id) on delete set null,
  social_links jsonb not null default '[]'::jsonb,
  is_founder boolean not null default false,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_social_is_array check (jsonb_typeof(social_links) = 'array')
);
create unique index if not exists people_single_founder_idx on public.people (is_founder) where is_founder;

create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  location text not null default 'header' check (location in ('header', 'footer')),
  parent_id uuid references public.navigation_items (id) on delete cascade,
  is_external boolean not null default false,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists navigation_location_order_idx on public.navigation_items (location, sort_order);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  organisation text,
  email text not null check (char_length(email) <= 200),
  inquiry text not null,
  message text not null check (char_length(message) between 20 and 4000),
  status public.message_status not null default 'new',
  ip_hash text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contact_messages_status_created_idx on public.contact_messages (status, created_at desc);

-- ─── updated_at triggers ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'media_assets', 'site_settings', 'pages', 'page_sections', 'page_section_drafts',
    'timeline_milestones', 'publications', 'awards', 'projects', 'technology_items',
    'principles', 'people', 'navigation_items', 'contact_messages'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;
