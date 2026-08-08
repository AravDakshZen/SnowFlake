-- Automation events, default LLM provider flag and investigation event linkage.
-- Idempotent: safe to run whether the schema is brand new OR already partially
-- exists from a prior run (the migration was generated after lib/schema.ts was
-- extended, so existing DBs are missing these objects entirely).

-- 1. llm_configs: add the default-provider flag (partial unique index).
ALTER TABLE public.llm_configs
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS llm_configs_default_idx
  ON public.llm_configs(project_id) WHERE is_default = true;

-- 2. automation_events: named events that bind a target repo to a fix model
--    and a commit model so the agent can analyze the latest commit and open
--    fixes/PRs autonomously.
CREATE TABLE IF NOT EXISTS public.automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  repo_owner text NOT NULL,
  repo_name text NOT NULL,
  default_branch text NOT NULL DEFAULT 'main',
  fix_provider text,
  fix_model text,
  commit_provider text,
  commit_model text,
  status text NOT NULL DEFAULT 'idle',
  last_commit_sha text,
  last_run_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  unique (project_id, name)
);

CREATE INDEX IF NOT EXISTS automation_events_project_idx
  ON public.automation_events(project_id);
CREATE INDEX IF NOT EXISTS automation_events_status_idx
  ON public.automation_events(status);

ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "automation_events_select_own" ON public.automation_events
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "automation_events_insert_own" ON public.automation_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "automation_events_update_own" ON public.automation_events
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "automation_events_delete_own" ON public.automation_events
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. investigations: link an investigation back to the automation event that
--    triggered it (set null when the event is deleted).
ALTER TABLE public.investigations
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.automation_events(id) ON DELETE SET NULL;
