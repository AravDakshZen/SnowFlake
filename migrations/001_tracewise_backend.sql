-- Migration: Add Tracewise Backend Tables and Extensions
-- Run these queries in your Supabase/PostgreSQL database

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- Add vector column to existing api_logs if it doesn't exist
-- (if api_logs table doesn't exist, it will be created by the schema setup)

-- Update api_logs table with new columns if they don't exist
ALTER TABLE IF EXISTS public.api_logs
  ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS investigation_id uuid REFERENCES public.investigations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for vector search
CREATE INDEX IF NOT EXISTS api_logs_embedding_idx ON public.api_logs 
  USING ivfflat (embedding vector_cosine_ops);

-- Update investigations table with new columns
ALTER TABLE IF EXISTS public.investigations
  ADD COLUMN IF NOT EXISTS log_id uuid,
  ADD COLUMN IF NOT EXISTS parent_investigation_id uuid REFERENCES public.investigations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affected_file text,
  ADD COLUMN IF NOT EXISTS affected_line integer,
  ADD COLUMN IF NOT EXISTS patch_diff text,
  ADD COLUMN IF NOT EXISTS confidence integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fix_strategy text,
  ADD COLUMN IF NOT EXISTS explanation text,
  ADD COLUMN IF NOT EXISTS pr_url text,
  ADD COLUMN IF NOT EXISTS pr_number integer,
  ADD COLUMN IF NOT EXISTS attempt integer DEFAULT 1;

-- Create LLM configs table
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

CREATE INDEX IF NOT EXISTS llm_configs_project_idx ON public.llm_configs(project_id);

ALTER TABLE public.llm_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "llm_configs_select_own" ON public.llm_configs 
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "llm_configs_insert_own" ON public.llm_configs 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "llm_configs_update_own" ON public.llm_configs 
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "llm_configs_delete_own" ON public.llm_configs 
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create GitHub configs table
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

CREATE INDEX IF NOT EXISTS github_configs_project_idx ON public.github_configs(project_id);

ALTER TABLE public.github_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "github_configs_select_own" ON public.github_configs 
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "github_configs_insert_own" ON public.github_configs 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "github_configs_update_own" ON public.github_configs 
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create alert configs table
CREATE TABLE IF NOT EXISTS public.alert_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_webhook_url text,
  email_address text,
  alert_on text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS alert_configs_project_idx ON public.alert_configs(project_id);

ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "alert_configs_select_own" ON public.alert_configs 
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "alert_configs_insert_own" ON public.alert_configs 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "alert_configs_update_own" ON public.alert_configs 
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.llm_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.github_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.alert_configs TO authenticated;
