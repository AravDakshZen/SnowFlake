-- Verified missing schema used by Tracewise audit and webhook routes.
-- Idempotent: safe to run whether the tables are brand new OR already exist
-- from an earlier partial run that lacked the user_id column.

-- 1. Investigation compatibility columns.
ALTER TABLE IF EXISTS public.investigations
  ADD COLUMN IF NOT EXISTS suggested_fix text,
  ADD COLUMN IF NOT EXISTS confidence_reasoning text,
  ADD COLUMN IF NOT EXISTS ci_status text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. audit_logs: create if new.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill any columns missing on a pre-existing audit_logs table.
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS audit_logs_project_created_idx
  ON public.audit_logs(project_id, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. outbound_webhooks: create if new.
CREATE TABLE IF NOT EXISTS public.outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill any columns missing on a pre-existing outbound_webhooks table.
-- Added nullable because an existing table may already hold rows; the app
-- always supplies user_id on insert.
ALTER TABLE public.outbound_webhooks
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS secret text,
  ADD COLUMN IF NOT EXISTS events text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS outbound_webhooks_project_idx
  ON public.outbound_webhooks(project_id, created_at DESC);
ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies (created after the columns are guaranteed to exist).
DO $$ BEGIN
  CREATE POLICY "audit_logs_select_own" ON public.audit_logs
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = audit_logs.project_id AND p.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "outbound_webhooks_select_own" ON public.outbound_webhooks
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "outbound_webhooks_insert_own" ON public.outbound_webhooks
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
