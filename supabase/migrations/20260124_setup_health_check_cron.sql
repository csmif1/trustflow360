-- =====================================================================
-- Setup pg_cron for automated daily policy health checks
-- Runs at 2 AM ET (7 AM UTC during EST, 6 AM UTC during EDT)
-- =====================================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing cron job if it exists (for re-running migration)
SELECT cron.unschedule('daily-policy-health-checks')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-policy-health-checks'
);

-- Schedule daily policy health checks at 2 AM ET (7 AM UTC)
-- Note: Adjust to 6 AM UTC during Daylight Saving Time if needed
SELECT cron.schedule(
  'daily-policy-health-checks',
  '0 7 * * *',  -- 7 AM UTC = 2 AM ET (during EST)
  $$
  SELECT net.http_post(
    url := 'https://fnivqabphgbmkzpwowwg.supabase.co/functions/v1/run-scheduled-health-checks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'trigger', 'scheduled',
      'timestamp', now()
    )
  ) AS request_id;
  $$
);

-- Create a table to track cron execution history
CREATE TABLE IF NOT EXISTS cron_execution_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('success', 'failed', 'running')),
  result JSONB,
  error_message TEXT,
  execution_duration_ms INTEGER
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cron_log_job_name ON cron_execution_log(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_log_execution_time ON cron_execution_log(execution_time DESC);

-- Add RLS to cron_execution_log
ALTER TABLE cron_execution_log ENABLE ROW LEVEL SECURITY;

-- Service role can manage logs
CREATE POLICY "Service role can manage cron logs"
  ON cron_execution_log FOR ALL
  USING (true);

-- Users can view cron logs for their own data
CREATE POLICY "Users can view cron execution logs"
  ON cron_execution_log FOR SELECT
  USING (true);  -- All authenticated users can view cron logs

-- Add comment explaining the schedule
COMMENT ON EXTENSION pg_cron IS 'PostgreSQL cron-based job scheduler - used for daily health checks';

-- Verify cron job was created
SELECT
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = 'daily-policy-health-checks';

-- Instructions for manual execution (for testing):
-- SELECT net.http_post(
--   url := 'https://fnivqabphgbmkzpwowwg.supabase.co/functions/v1/run-scheduled-health-checks',
--   headers := jsonb_build_object(
--     'Authorization', 'Bearer [SERVICE_ROLE_KEY]',
--     'Content-Type', 'application/json'
--   ),
--   body := jsonb_build_object('trigger', 'manual', 'timestamp', now())
-- );
