-- Migration: Add multi-file PR support, category IDs, and models used tracking
-- Idempotent: safe to run whether the schema is brand new OR already partially exists

-- 1. investigations: add models_used, file_results, category_ids, total_estimated_minutes columns
ALTER TABLE public.investigations
  ADD COLUMN IF NOT EXISTS models_used jsonb,
  ADD COLUMN IF NOT EXISTS file_results jsonb,
  ADD COLUMN IF NOT EXISTS category_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_estimated_minutes integer;

-- 2. automation_events: add category_ids column
ALTER TABLE public.automation_events
  ADD COLUMN IF NOT EXISTS category_ids text[] DEFAULT '{}';

-- 3. Add index for category_ids on investigations
CREATE INDEX IF NOT EXISTS investigations_category_ids_idx
  ON public.investigations USING gin(category_ids);
