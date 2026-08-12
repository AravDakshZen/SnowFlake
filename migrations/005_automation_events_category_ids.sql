-- Add category_ids to automation_events (the POST /api/events route already
-- sends this field but the table was created without it, causing inserts to
-- fail with "Could not create event").

ALTER TABLE public.automation_events
  ADD COLUMN IF NOT EXISTS category_ids text[] DEFAULT ARRAY['critical_errors','security','logic_errors','code_quality','style_cleanup'];
