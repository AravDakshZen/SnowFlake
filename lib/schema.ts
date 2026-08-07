// Idempotent schema definition for Snowflake.
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
  log_id uuid,
  parent_investigation_id uuid references public.investigations(id) on delete set null,
  question text not null,
  summary text,
  root_cause text,
  affected_file text,
  affected_line integer,
  patch_diff text,
  confidence integer default 0,
  fix_strategy text,
  explanation text,
  status text not null default 'in_progress',
  pr_url text,
  pr_number integer,
  attempt integer default 1,
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

-- API logs with vector embeddings for error fingerprinting -----------------
create extension if not exists "vector";

create table if not exists public.api_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cluster_id uuid references public.clusters(id) on delete set null,
  investigation_id uuid references public.investigations(id) on delete set null,
  endpoint text not null,
  method text not null,
  status_code integer not null,
  stack_trace text not null,
  request_body jsonb,
  response_body jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index if not exists api_logs_project_idx on public.api_logs(project_id);
create index if not exists api_logs_cluster_idx on public.api_logs(cluster_id);
create index if not exists api_logs_embedding_idx on public.api_logs using ivfflat (embedding vector_cosine_ops);

alter table public.api_logs enable row level security;

do $$ begin
  create policy "api_logs_select_own" on public.api_logs for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "api_logs_insert_own" on public.api_logs for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- LLM Configuration --------------------------------------------------------
create table if not exists public.llm_configs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  encrypted_key text not null,
  base_url text,
  created_at timestamptz not null default now(),
  unique (project_id, provider)
);
create index if not exists llm_configs_project_idx on public.llm_configs(project_id);

alter table public.llm_configs enable row level security;

do $$ begin
  create policy "llm_configs_select_own" on public.llm_configs for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "llm_configs_insert_own" on public.llm_configs for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "llm_configs_update_own" on public.llm_configs for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "llm_configs_delete_own" on public.llm_configs for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- GitHub Configuration ------------------------------------------------------
create table if not exists public.github_configs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  repo_owner text not null,
  repo_name text not null,
  default_branch text not null,
  encrypted_token text not null,
  webhook_id text,
  created_at timestamptz not null default now(),
  unique (project_id)
);
create index if not exists github_configs_project_idx on public.github_configs(project_id);

alter table public.github_configs enable row level security;

do $$ begin
  create policy "github_configs_select_own" on public.github_configs for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "github_configs_insert_own" on public.github_configs for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "github_configs_update_own" on public.github_configs for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Alert Configuration -------------------------------------------------------
create table if not exists public.alert_configs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slack_webhook_url text,
  email_address text,
  alert_on text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists alert_configs_project_idx on public.alert_configs(project_id);

alter table public.alert_configs enable row level security;

do $$ begin
  create policy "alert_configs_select_own" on public.alert_configs for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "alert_configs_insert_own" on public.alert_configs for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "alert_configs_update_own" on public.alert_configs for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Audit and outbound webhook tables used by the settings and audit routes.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_project_created_idx on public.audit_logs(project_id, created_at desc);
alter table public.audit_logs enable row level security;
do $$ begin
  create policy "audit_logs_select_own" on public.audit_logs for select using (exists (
    select 1 from public.projects p where p.id = audit_logs.project_id and p.user_id = auth.uid()
  ));
exception when duplicate_object then null; end $$;

create table if not exists public.outbound_webhooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  secret text not null,
  events text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists outbound_webhooks_project_idx on public.outbound_webhooks(project_id, created_at desc);
alter table public.outbound_webhooks enable row level security;
do $$ begin
  create policy "outbound_webhooks_select_own" on public.outbound_webhooks for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "outbound_webhooks_insert_own" on public.outbound_webhooks for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
`
