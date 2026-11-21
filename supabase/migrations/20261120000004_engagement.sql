-- ════════════════════════════════════════════════════════════════════
-- VoltageAfrica CMS · 004 · Engagement system
-- Partnership requests, support / contribution inquiries and contact
-- messages, managed from the admin "Engagement Inbox".
--
-- Safe to run on a live database and safe to run more than once:
--   • nothing is dropped or truncated
--   • contact_messages is extended in place (existing rows are kept and
--     their status is mapped onto the new workflow)
--
-- Security model (same as contact_messages before):
--   • the public NEVER reads or writes these tables through the API
--   • /api/partnership, /api/support and /api/contact validate, rate-limit
--     and then insert with the service role (server only, bypasses RLS)
--   • administrators (row in public.profiles) read, update and delete
--
-- NOTE: 002_security.sql drops every policy in the public schema before
-- recreating its own. If you ever re-run 002 on its own, re-run this file
-- afterwards. (Until you do, these tables fail closed: nobody can read them.)
-- ════════════════════════════════════════════════════════════════════


-- ─── Shared workflow status ──────────────────────────────────────────
do $$ begin
  create type public.engagement_status as enum ('new', 'reviewed', 'in_discussion', 'accepted', 'declined', 'completed');
exception when duplicate_object then null; end $$;


-- ─── contact_messages: move onto the shared workflow ─────────────────
alter table public.contact_messages
  add column if not exists subject text,
  add column if not exists admin_notes text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_messages' and column_name = 'status' and udt_name = 'message_status'
  ) then
    -- Keep the meaning of archived messages, which have no direct equivalent.
    update public.contact_messages
      set admin_notes = concat_ws(E'\n\n', admin_notes, 'Archived before the Engagement Inbox was introduced.')
      where status::text = 'archived';
    alter table public.contact_messages alter column status drop default;
    alter table public.contact_messages
      alter column status type public.engagement_status using (
        case status::text
          when 'new' then 'new'
          when 'read' then 'reviewed'
          when 'responded' then 'completed'
          when 'archived' then 'completed'
          else 'new'
        end
      )::public.engagement_status;
    alter table public.contact_messages alter column status set default 'new';
  end if;
end $$;

do $$ begin
  alter table public.contact_messages add constraint contact_messages_subject_len check (subject is null or char_length(subject) <= 200);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.contact_messages add constraint contact_messages_notes_len check (admin_notes is null or char_length(admin_notes) <= 10000);
exception when duplicate_object then null; end $$;

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_inquiry_idx on public.contact_messages (inquiry);
create index if not exists contact_messages_email_idx on public.contact_messages (email);


-- ─── Partnership requests ────────────────────────────────────────────
create table if not exists public.partnership_inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  organisation text not null check (char_length(organisation) between 1 and 160),
  email text not null check (char_length(email) between 3 and 200 and position('@' in email) > 1),
  phone text check (phone is null or char_length(phone) <= 40),
  country text not null check (char_length(country) between 2 and 80),
  category text not null check (category in (
    'Technology & Engineering', 'Energy Infrastructure', 'Strategic Partnerships', 'Funding & Investment',
    'Research & Academia', 'Community Development', 'Implementation Partners', 'Corporate Partnerships', 'Other'
  )),
  proposal text not null check (char_length(proposal) between 3 and 300),
  message text not null check (char_length(message) between 20 and 4000),
  website text check (website is null or (char_length(website) <= 300 and website ~* '^https?://')),
  consent boolean not null check (consent),
  status public.engagement_status not null default 'new',
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 10000),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partnership_status_created_idx on public.partnership_inquiries (status, created_at desc);
create index if not exists partnership_created_idx on public.partnership_inquiries (created_at desc);
create index if not exists partnership_category_idx on public.partnership_inquiries (category);
create index if not exists partnership_email_idx on public.partnership_inquiries (email);


-- ─── Support / contribution inquiries ────────────────────────────────
-- A pledge / interest record only. No payment is taken or implied.
create table if not exists public.support_inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 200 and position('@' in email) > 1),
  country text not null check (char_length(country) between 2 and 80),
  support_type text not null check (support_type in (
    'Financial contribution', 'Equipment donation', 'Technical expertise', 'Professional services', 'Institutional support', 'Other'
  )),
  support_form text not null check (support_form in ('financial', 'equipment', 'services', 'other')),
  amount numeric(14, 2) check (amount is null or (amount > 0 and amount <= 1000000000000)),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  support_area text not null check (char_length(support_area) between 2 and 120),
  message text not null check (char_length(message) between 10 and 4000),
  consent boolean not null check (consent),
  status public.engagement_status not null default 'new',
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 10000),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_status_created_idx on public.support_inquiries (status, created_at desc);
create index if not exists support_created_idx on public.support_inquiries (created_at desc);
create index if not exists support_type_idx on public.support_inquiries (support_type);
create index if not exists support_email_idx on public.support_inquiries (email);


-- ─── Private admin settings (single row) ─────────────────────────────
-- site_settings is publicly readable, so the notification recipient lives here.
create table if not exists public.admin_settings (
  id smallint primary key default 1 check (id = 1),
  notification_email text check (notification_email is null or (char_length(notification_email) <= 200 and notification_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  notify_partnership boolean not null default true,
  notify_support boolean not null default true,
  notify_contact boolean not null default true,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.admin_settings (id) values (1) on conflict (id) do nothing;


-- ─── Public site settings: contact details & secondary header link ───
alter table public.site_settings
  add column if not exists contact_phone text,
  add column if not exists contact_location text,
  add column if not exists nav_secondary_label text not null default 'Partner with us',
  add column if not exists nav_secondary_href text not null default '/partner';


-- ─── Navigation: a "Get involved" group (mobile menu & footer) ───────
alter table public.navigation_items drop constraint if exists navigation_items_location_check;
alter table public.navigation_items add constraint navigation_items_location_check check (location in ('header', 'footer', 'engage'));


-- ─── updated_at triggers ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['partnership_inquiries', 'support_inquiries', 'admin_settings'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;


-- ─── Row Level Security ──────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['partnership_inquiries', 'support_inquiries', 'admin_settings', 'contact_messages'] loop
    execute format('alter table public.%I enable row level security', t);
    -- Defence in depth: the anonymous role has no table privileges at all,
    -- and nobody may insert through the API (the server uses the service role).
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert on public.%I from authenticated', t);
  end loop;

  foreach t in array array['partnership_inquiries', 'support_inquiries'] loop
    execute format('drop policy if exists %I on public.%I', t || ': admins read', t);
    execute format('drop policy if exists %I on public.%I', t || ': admins update', t);
    execute format('drop policy if exists %I on public.%I', t || ': admins delete', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.is_admin()))', t || ': admins read', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t || ': admins update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))', t || ': admins delete', t);
  end loop;
end $$;

drop policy if exists "admin_settings: admins read" on public.admin_settings;
drop policy if exists "admin_settings: admins update" on public.admin_settings;
create policy "admin_settings: admins read" on public.admin_settings
  for select to authenticated using ((select public.is_admin()));
create policy "admin_settings: admins update" on public.admin_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- The single row is created above; no insert or delete through the API.
