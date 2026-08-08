-- Add the missing auto_pr column to github_configs.
-- lib/schema.ts declares auto_pr (default true) and the investigation worker
-- plus /api/github/repos both read/write it, but no earlier migration created
-- the column. Without it, creating an automation event crashes with
-- `column "auto_pr" does not exist`.
-- Idempotent: safe to run on any environment.

ALTER TABLE public.github_configs
  ADD COLUMN IF NOT EXISTS auto_pr boolean NOT NULL DEFAULT true;
