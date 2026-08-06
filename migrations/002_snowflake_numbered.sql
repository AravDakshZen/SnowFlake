-- ============================================================================
-- SNOWFLAKE DATABASE MIGRATION - NUMBERED STEPS
-- ============================================================================
-- Execute each query in sequence (by number) in your Supabase SQL Editor
-- All tables are created with IF NOT EXISTS, so it's safe to re-run
-- ============================================================================

-- STEP 1: Ensure pgvector extension is available (already enabled in Supabase)
-- This step is automatic in Supabase, no action needed.
-- If you get "pgvector not available" error, pgvector is already installed.

-- ============================================================================
-- STEP 2: Create API Logs Table with pgvector embeddings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cluster_id uuid REFERENCES public.clusters(id) ON DELETE SET NULL,
  investigation_id uuid REFERENCES public.investigations(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  stack_trace text NOT NULL,
  request_body jsonb,
  response_body jsonb,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- STEP 3: Create indexes for API Logs
CREATE INDEX IF NOT EXISTS api_logs_project_idx ON public.api_logs(project_id);
CREATE INDEX IF NOT EXISTS api_logs_cluster_idx ON public.api_logs(cluster_id);
CREATE INDEX IF NOT EXISTS api_logs_embedding_idx ON public.api_logs USING ivfflat (embedding vector_cosine_ops);

-- STEP 4: Enable Row Level Security for API Logs
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS Policy - SELECT own api logs
DO $$ BEGIN
  CREATE POLICY "api_logs_select_own" ON public.api_logs 
    FOR SELECT 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- STEP 6: Create RLS Policy - INSERT own api logs
DO $$ BEGIN
  CREATE POLICY "api_logs_insert_own" ON public.api_logs 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- ============================================================================
-- STEP 7: Create LLM Configs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.llm_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  encrypted_key text NOT NULL,
  base_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, provider)
);

-- STEP 8: Create index for LLM Configs
CREATE INDEX IF NOT EXISTS llm_configs_project_idx ON public.llm_configs(project_id);

-- STEP 9: Enable Row Level Security for LLM Configs
ALTER TABLE public.llm_configs ENABLE ROW LEVEL SECURITY;

-- STEP 10: Create RLS Policy - SELECT own llm configs
DO $$ BEGIN
  CREATE POLICY "llm_configs_select_own" ON public.llm_configs 
    FOR SELECT 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- STEP 11: Create RLS Policy - INSERT own llm configs
DO $$ BEGIN
  CREATE POLICY "llm_configs_insert_own" ON public.llm_configs 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- STEP 12: Create RLS Policy - UPDATE own llm configs
DO $$ BEGIN
  CREATE POLICY "llm_configs_update_own" ON public.llm_configs 
    FOR UPDATE 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- STEP 13: Create RLS Policy - DELETE own llm configs
DO $$ BEGIN
  CREATE POLICY "llm_configs_delete_own" ON public.llm_configs 
    FOR DELETE 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- ============================================================================
-- STEP 14: Create GitHub Configs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.github_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_owner text NOT NULL,
  repo_name text NOT NULL,
  default_branch text NOT NULL,
  encrypted_token text NOT NULL,
  webhook_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- STEP 15: Create index for GitHub Configs
CREATE INDEX IF NOT EXISTS github_configs_project_idx ON public.github_configs(project_id);

-- STEP 16: Enable Row Level Security for GitHub Configs
ALTER TABLE public.github_configs ENABLE ROW LEVEL SECURITY;

-- STEP 17: Create RLS Policy - SELECT own github configs
DO $$ BEGIN
  CREATE POLICY "github_configs_select_own" ON public.github_configs 
    FOR SELECT 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- STEP 18: Create RLS Policy - INSERT own github configs
DO $$ BEGIN
  CREATE POLICY "github_configs_insert_own" ON public.github_configs 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- STEP 19: Create RLS Policy - UPDATE own github configs
DO $$ BEGIN
  CREATE POLICY "github_configs_update_own" ON public.github_configs 
    FOR UPDATE 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- ============================================================================
-- STEP 20: Create Alert Configs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.alert_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_webhook_url text,
  email_address text,
  alert_on text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- STEP 21: Create index for Alert Configs
CREATE INDEX IF NOT EXISTS alert_configs_project_idx ON public.alert_configs(project_id);

-- STEP 22: Enable Row Level Security for Alert Configs
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;

-- STEP 23: Create RLS Policy - SELECT own alert configs
DO $$ BEGIN
  CREATE POLICY "alert_configs_select_own" ON public.alert_configs 
    FOR SELECT 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- STEP 24: Create RLS Policy - INSERT own alert configs
DO $$ BEGIN
  CREATE POLICY "alert_configs_insert_own" ON public.alert_configs 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- STEP 25: Create RLS Policy - UPDATE own alert configs
DO $$ BEGIN
  CREATE POLICY "alert_configs_update_own" ON public.alert_configs 
    FOR UPDATE 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables, indexes, and RLS policies have been created successfully!
-- You can now use the Snowflake API endpoints to start ingesting logs and 
-- configuring LLM providers, GitHub integration, and alerts.
-- ============================================================================
