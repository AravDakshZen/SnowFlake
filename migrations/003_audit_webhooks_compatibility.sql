-- Verified missing schema used by Tracewise audit and webhook routes.
-- Run this migration in Supabase/PostgreSQL before using those features.

ALTER TABLE IF EXISTS public.investigations
  ADD COLUMN IF NOT EXISTS suggested_fix text,
  ADD COLUMN IF NOT EXISTS confidence_reasoning text,
  ADD COLUMN IF NOT EXISTS ci_status text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

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
CREATE INDEX IF NOT EXISTS audit_logs_project_created_idx
  ON public.audit_logs(project_id, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbound_webhooks_project_idx
  ON public.outbound_webhooks(project_id, created_at DESC);
ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;

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
