// Idempotent schema definition for Tracewise.
// Executed by the /api/setup route using the migration Postgres client.
// Data access from the app goes through RLS-protected Supabase queries where
// possible; server route handlers additionally scope every query by the
// authenticated user id.

export const SCHEMA_SQL = /* sql */ `
create extension if not exists "pgcrypto";

-- Projects owned by an authenticated user -----------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  environment text not null default 'production',
  created_at timestamptz not null default now()
);
create index if not exists projects_user_id_idx on public.projects(user_id);

alter table public.projects enable row level security;

do $$ begin
  create policy "projects_select_own" on public.projects for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "projects_update_own" on public.projects for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "projects_delete_own" on public.projects for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- API keys (only a hash is stored) ------------------------------------------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists api_keys_project_id_idx on public.api_keys(project_id);
create index if not exists api_keys_hash_idx on public.api_keys(key_hash);

alter table public.api_keys enable row level security;

do $$ begin
  create policy "api_keys_select_own" on public.api_keys for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "api_keys_insert_own" on public.api_keys for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.projects p where p.id = api_keys.project_id and p.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "api_keys_update_own" on public.api_keys for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "api_keys_delete_own" on public.api_keys for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Error clusters (grouped signals) ------------------------------------------
create table if not exists public.clusters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  title text not null,
  level text not null default 'error',
  status text not null default 'open',
  service text,
  environment text not null default 'production',
  event_count integer not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (project_id, fingerprint)
);
create index if not exists clusters_project_id_idx on public.clusters(project_id);
create index if not exists clusters_last_seen_idx on public.clusters(last_seen_at desc);

alter table public.clusters enable row level security;

do $$ begin
  create policy "clusters_select_own" on public.clusters for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "clusters_insert_own" on public.clusters for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "clusters_update_own" on public.clusters for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "clusters_delete_own" on public.clusters for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Individual events (log/trace entries) -------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.clusters(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null default 'error',
  message text not null,
  service text,
  environment text not null default 'production',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists events_cluster_id_idx on public.events(cluster_id);
create index if not exists events_project_id_idx on public.events(project_id);
create index if not exists events_occurred_idx on public.events(occurred_at desc);

alter table public.events enable row level security;

do $$ begin
  create policy "events_select_own" on public.events for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "events_insert_own" on public.events for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "events_delete_own" on public.events for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Investigations ------------------------------------------------------------
create table if not exists public.investigations (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.clusters(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  summary text,
  root_cause text,
  status text not null default 'in_progress',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists investigations_cluster_idx on public.investigations(cluster_id);
create index if not exists investigations_project_idx on public.investigations(project_id);

alter table public.investigations enable row level security;

do $$ begin
  create policy "investigations_select_own" on public.investigations for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "investigations_insert_own" on public.investigations for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "investigations_update_own" on public.investigations for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "investigations_delete_own" on public.investigations for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
`
