# Snowflake Database Setup Guide

## Overview
This guide provides step-by-step SQL queries you need to run in your Supabase SQL Editor to set up the Snowflake backend database.

**Important:** Run each query **one at a time** in your Supabase SQL Editor (not all at once).

---

## Part 1: API Logs Table (Steps 1-6)

### Step 1: Create API Logs Table
Copy and paste this entire query into Supabase SQL Editor and run it:

```sql
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
```

**Expected result:** `CREATE TABLE` (success)

---

### Step 2: Create Index for API Logs - Project
```sql
CREATE INDEX IF NOT EXISTS api_logs_project_idx ON public.api_logs(project_id);
```

**Expected result:** `CREATE INDEX` (success)

---

### Step 3: Create Index for API Logs - Cluster
```sql
CREATE INDEX IF NOT EXISTS api_logs_cluster_idx ON public.api_logs(cluster_id);
```

**Expected result:** `CREATE INDEX` (success)

---

### Step 4: Create Index for API Logs - Embedding (Vector Search)
```sql
CREATE INDEX IF NOT EXISTS api_logs_embedding_idx ON public.api_logs USING ivfflat (embedding vector_cosine_ops);
```

**Expected result:** `CREATE INDEX` (success)

---

### Step 5: Enable Row Level Security
```sql
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
```

**Expected result:** `ALTER TABLE` (success)

---

### Step 6: Create SELECT Policy
```sql
DO $$ BEGIN
  CREATE POLICY "api_logs_select_own" ON public.api_logs 
    FOR SELECT 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

**Expected result:** `DO` (success or duplicate policy - both are fine)

---

### Step 7: Create INSERT Policy
```sql
DO $$ BEGIN
  CREATE POLICY "api_logs_insert_own" ON public.api_logs 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

**Expected result:** `DO` (success or duplicate policy - both are fine)

---

## Part 2: LLM Configs Table (Steps 8-13)

### Step 8: Create LLM Configs Table
```sql
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
```

**Expected result:** `CREATE TABLE` (success)

---

### Step 9: Create Index for LLM Configs
```sql
CREATE INDEX IF NOT EXISTS llm_configs_project_idx ON public.llm_configs(project_id);
```

**Expected result:** `CREATE INDEX` (success)

---

### Step 10: Enable Row Level Security
```sql
ALTER TABLE public.llm_configs ENABLE ROW LEVEL SECURITY;
```

**Expected result:** `ALTER TABLE` (success)

---

### Step 11: Create SELECT Policy
```sql
DO $$ BEGIN
  CREATE POLICY "llm_configs_select_own" ON public.llm_configs 
    FOR SELECT 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

---

### Step 12: Create INSERT Policy
```sql
DO $$ BEGIN
  CREATE POLICY "llm_configs_insert_own" ON public.llm_configs 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

---

### Step 13: Create UPDATE Policy
```sql
DO $$ BEGIN
  CREATE POLICY "llm_configs_update_own" ON public.llm_configs 
    FOR UPDATE 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

---

### Step 14: Create DELETE Policy
```sql
DO $$ BEGIN
  CREATE POLICY "llm_configs_delete_own" ON public.llm_configs 
    FOR DELETE 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

---

## Part 3: GitHub Configs Table (Steps 15-18)

### Step 15: Create GitHub Configs Table
```sql
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
```

**Expected result:** `CREATE TABLE` (success)

---

### Step 16: Create Index for GitHub Configs
```sql
CREATE INDEX IF NOT EXISTS github_configs_project_idx ON public.github_configs(project_id);
```

---

### Step 17: Enable Row Level Security
```sql
ALTER TABLE public.github_configs ENABLE ROW LEVEL SECURITY;
```

---

### Step 18: Create SELECT Policy
```sql
DO $$ BEGIN
  CREATE POLICY "github_configs_select_own" ON public.github_configs 
    FOR SELECT 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

---

### Step 19: Create INSERT Policy
```sql
DO $$ BEGIN
  CREATE POLICY "github_configs_insert_own" ON public.github_configs 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

---

### Step 20: Create UPDATE Policy
```sql
DO $$ BEGIN
  CREATE POLICY "github_configs_update_own" ON public.github_configs 
    FOR UPDATE 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

---

## Part 4: Alert Configs Table (Steps 21-25)

### Step 21: Create Alert Configs Table
```sql
CREATE TABLE IF NOT EXISTS public.alert_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_webhook_url text,
  email_address text,
  alert_on text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

### Step 22: Create Index for Alert Configs
```sql
CREATE INDEX IF NOT EXISTS alert_configs_project_idx ON public.alert_configs(project_id);
```

---

### Step 23: Enable Row Level Security
```sql
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;
```

---

### Step 24: Create SELECT Policy
```sql
DO $$ BEGIN
  CREATE POLICY "alert_configs_select_own" ON public.alert_configs 
    FOR SELECT 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

---

### Step 25: Create INSERT Policy
```sql
DO $$ BEGIN
  CREATE POLICY "alert_configs_insert_own" ON public.alert_configs 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

---

### Step 26: Create UPDATE Policy
```sql
DO $$ BEGIN
  CREATE POLICY "alert_configs_update_own" ON public.alert_configs 
    FOR UPDATE 
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;
```

---

## Verification

After running all 26 steps, verify everything was created:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('api_logs', 'llm_configs', 'github_configs', 'alert_configs');
```

**Expected output:** 4 rows (all tables created)

---

## Troubleshooting

### Error: "relation does not exist"
**Solution:** Make sure you ran the base schema first by executing `/api/setup` in your browser, which creates `projects`, `clusters`, `events`, and `investigations` tables.

### Error: "column does not exist"
**Solution:** This usually means a table wasn't created properly. Go back and re-run that step.

### Error: "duplicate object"
**Solution:** This is normal and expected for policies. The DO...EXCEPTION block handles duplicates gracefully.

### pgvector error
**Solution:** pgvector is automatically enabled in Supabase. You don't need to run CREATE EXTENSION.

---

## Next Steps

1. ✅ Run all 26 SQL queries above
2. ✅ Verify tables with the verification query
3. ⏭️ Create a new project at `/dashboard`
4. ⏭️ Configure LLM providers at `/settings`
5. ⏭️ Connect GitHub at `/settings`
6. ⏭️ Start ingesting logs via the API

Enjoy Snowflake! ❄️
