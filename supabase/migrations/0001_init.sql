-- Ghost Hub: schema, Row Level Security, storage policies.
-- Idempotent enough to re-run on a fresh project; apply with the Supabase SQL editor or CLI.
--
-- Security model
--   * Single owner. The first account to sign up becomes the owner; nobody else can ever become one.
--   * All writes require is_owner(). Anonymous visitors can only read PUBLISHED projects and the
--     files explicitly marked public that belong to them.
--   * The storage bucket is private. Anonymous reads of objects are allowed only when a matching
--     `files` row is public AND its project is published. Unpublishing stops NEW signed URLs at once;
--     URLs already issued stay valid until they expire (1 hour for media, 60 s for downloads).
--   * repository_url is never granted to anon; only the generated public_repository_url is.

create extension if not exists pgcrypto;

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default 'Creator',
  avatar_url    text,
  is_owner      boolean not null default false,
  headline      text not null default '',
  bio           text not null default '',
  created_at    timestamptz not null default now()
);
-- At most one owner can exist.
create unique index if not exists profiles_single_owner on public.profiles ((is_owner)) where is_owner;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, is_owner)
  values (
    new.id,
    coalesce(nullif(split_part(new.email, '@', 1), ''), 'Creator'),
    not exists (select 1 from public.profiles where is_owner)
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  -- Owner AND, if the owner has enrolled a verified MFA factor, a session that completed MFA (aal2).
  select exists (select 1 from public.profiles where id = (select auth.uid()) and is_owner)
     and (
       coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
       or not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified')
     );
$$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

-- ───────────────────────── projects ─────────────────────────
create table if not exists public.projects (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references public.profiles(id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 120),
  slug               text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  short_description  text not null default '' check (char_length(short_description) <= 280),
  description        text not null default '' check (char_length(description) <= 20000),
  features           text[] not null default '{}',
  category           text not null default 'Other Innovations' check (char_length(category) between 1 and 60),
  technologies       text[] not null default '{}',
  tags               text[] not null default '{}',
  status             text not null default 'in_progress'
                       check (status in ('idea','prototype','in_progress','released','maintained')),
  visibility         text not null default 'draft' check (visibility in ('draft','published','archived')),
  thumbnail_file_id  uuid,
  repository_url     text check (repository_url is null or repository_url ~* '^https?://'),
  repository_is_public boolean not null default false,
  live_demo_url      text check (live_demo_url is null or live_demo_url ~* '^https?://'),
  video_url          text check (video_url is null or video_url ~* '^https?://'),
  extra_links        jsonb not null default '[]'::jsonb,
  is_featured        boolean not null default false,
  created_on         date not null default current_date,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Safe to expose: only populated when the owner marks the repo public.
  public_repository_url text generated always as (case when repository_is_public then repository_url end) stored,
  constraint projects_slug_unique unique (slug)
);
create index if not exists projects_visibility_updated on public.projects (visibility, updated_at desc);
create index if not exists projects_category on public.projects (category) where visibility = 'published';
create index if not exists projects_tech_gin on public.projects using gin (technologies);
create index if not exists projects_featured on public.projects (is_featured) where visibility = 'published';

-- ───────────────────────── files ─────────────────────────
create table if not exists public.files (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete set null,
  folder            text not null default '' check (char_length(folder) <= 120),
  role              text not null default 'attachment'
                      check (role in ('thumbnail','screenshot','video','attachment')),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  storage_provider  text not null default 'supabase',
  storage_key       text not null unique,
  mime_type         text not null default 'application/octet-stream',
  file_size         bigint not null check (file_size >= 0),
  checksum          text check (checksum is null or checksum ~ '^[0-9a-f]{64}$'), -- SHA-256 hex
  visibility        text not null default 'private' check (visibility in ('private','public')),
  sort_order        int not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists files_project on public.files (project_id, role, sort_order);
create index if not exists files_owner_created on public.files (owner_id, created_at desc);

alter table public.projects
  drop constraint if exists projects_thumbnail_fk,
  add constraint projects_thumbnail_fk foreign key (thumbnail_file_id)
    references public.files(id) on delete set null;

-- ───────────────────────── releases ─────────────────────────
create table if not exists public.releases (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  version       text not null check (char_length(version) between 1 and 40),
  release_notes text not null default '' check (char_length(release_notes) <= 10000),
  release_date  date not null default current_date,
  visibility    text not null default 'private' check (visibility in ('private','public')),
  created_at    timestamptz not null default now(),
  unique (project_id, version)
);

-- ───────────────────────── activity_log ─────────────────────────
create table if not exists public.activity_log (
  id            bigint generated always as identity primary key,
  owner_id      uuid,
  operation     text not null,
  resource_type text not null,
  resource_id   uuid,
  detail        text,
  created_at    timestamptz not null default now()
);
create index if not exists activity_created on public.activity_log (created_at desc);

-- Audit trail is written by triggers, so it cannot be skipped or forged from the client.
create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare rid uuid; det text;
begin
  rid := coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'))::uuid;
  det := coalesce(to_jsonb(new)->>'name', to_jsonb(old)->>'name',
                  to_jsonb(new)->>'original_filename', to_jsonb(old)->>'original_filename');
  insert into public.activity_log (owner_id, operation, resource_type, resource_id, detail)
  values ((select auth.uid()), lower(tg_op), tg_table_name, rid, det);
  return coalesce(new, old);
end $$;

drop trigger if exists projects_audit on public.projects;
create trigger projects_audit after insert or update or delete on public.projects
  for each row execute function public.log_activity();
drop trigger if exists files_audit on public.files;
create trigger files_audit after insert or delete on public.files
  for each row execute function public.log_activity();

-- ───────────────────────── housekeeping triggers ─────────────────────────
create or replace function public.touch_project()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.visibility = 'published' and (tg_op = 'INSERT' or old.visibility is distinct from 'published') then
    new.published_at := now();
  end if;
  return new;
end $$;
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before insert or update on public.projects
  for each row execute function public.touch_project();

-- A file may only be attached to a project owned by the same owner (blocks ID-swapping).
create or replace function public.check_file_project()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id and p.owner_id = new.owner_id
  ) then
    raise exception 'project does not belong to file owner';
  end if;
  return new;
end $$;
drop trigger if exists files_check_project on public.files;
create trigger files_check_project before insert or update of project_id on public.files
  for each row execute function public.check_file_project();

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles     enable row level security;
alter table public.projects     enable row level security;
alter table public.files        enable row level security;
alter table public.releases     enable row level security;
alter table public.activity_log enable row level security;

-- profiles: the owner reads/updates their own; anon may read the owner's public identity.
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select to anon, authenticated using (is_owner);
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) and is_owner) with check (id = (select auth.uid()) and is_owner);

-- projects
drop policy if exists projects_public_read on public.projects;
create policy projects_public_read on public.projects for select to anon, authenticated
  using (visibility = 'published');
drop policy if exists projects_owner_all on public.projects;
create policy projects_owner_all on public.projects for all to authenticated
  using (public.is_owner() and owner_id = (select auth.uid()))
  with check (public.is_owner() and owner_id = (select auth.uid()));

-- files
drop policy if exists files_public_read on public.files;
create policy files_public_read on public.files for select to anon, authenticated
  using (visibility = 'public' and exists (
    select 1 from public.projects p where p.id = files.project_id and p.visibility = 'published'));
drop policy if exists files_owner_all on public.files;
create policy files_owner_all on public.files for all to authenticated
  using (public.is_owner() and owner_id = (select auth.uid()))
  with check (public.is_owner() and owner_id = (select auth.uid()));

-- releases
drop policy if exists releases_public_read on public.releases;
create policy releases_public_read on public.releases for select to anon, authenticated
  using (visibility = 'public' and exists (
    select 1 from public.projects p where p.id = releases.project_id and p.visibility = 'published'));
drop policy if exists releases_owner_all on public.releases;
create policy releases_owner_all on public.releases for all to authenticated
  using (public.is_owner() and exists (select 1 from public.projects p where p.id = releases.project_id and p.owner_id = (select auth.uid())))
  with check (public.is_owner() and exists (select 1 from public.projects p where p.id = releases.project_id and p.owner_id = (select auth.uid())));

-- activity_log: owner can read; nobody writes directly (triggers are security definer).
drop policy if exists activity_owner_read on public.activity_log;
create policy activity_owner_read on public.activity_log for select to authenticated using (public.is_owner());

-- ───────────────────────── column-level grants ─────────────────────────
-- Anonymous visitors get an explicit allow-list of columns; private fields stay unreachable
-- even if a policy were ever loosened by mistake.
revoke all on public.profiles, public.projects, public.files, public.releases, public.activity_log from anon;
grant select (id, display_name, avatar_url, headline, bio) on public.profiles to anon;
grant select (id, name, slug, short_description, description, features, category, technologies, tags,
              status, visibility, thumbnail_file_id, live_demo_url, video_url, extra_links, is_featured,
              created_on, published_at, created_at, updated_at, public_repository_url)
  on public.projects to anon;
grant select (id, project_id, role, original_filename, storage_key, mime_type, file_size, checksum,
              visibility, sort_order, created_at)
  on public.files to anon;
grant select (id, project_id, version, release_notes, release_date, visibility) on public.releases to anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects, public.files, public.releases to authenticated;
grant select on public.activity_log to authenticated;

-- ───────────────────────── storage ─────────────────────────
-- Private bucket, 50 MB per object (Supabase Free plan ceiling). Randomized keys are generated by the app.
insert into storage.buckets (id, name, public, file_size_limit)
values ('hub-files', 'hub-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists hub_owner_all on storage.objects;
create policy hub_owner_all on storage.objects for all to authenticated
  using (bucket_id = 'hub-files' and public.is_owner())
  with check (bucket_id = 'hub-files' and public.is_owner());

-- Anonymous visitors may read (i.e. be issued signed URLs for) only objects that belong to a public
-- file of a published project.
drop policy if exists hub_public_read on storage.objects;
create policy hub_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'hub-files' and exists (
    select 1 from public.files f join public.projects p on p.id = f.project_id
    where f.storage_key = storage.objects.name and f.visibility = 'public' and p.visibility = 'published'));
