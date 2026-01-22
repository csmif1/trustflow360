-- Setup Supabase Cron Jobs for Automated Compliance Tasks
-- Created: 2026-01-22
-- Sprint 2 - Task SPRINT2-004

-- This migration configures pg_cron to automatically execute edge functions on a schedule.
-- These jobs automate compliance tasks for TrustFlow360 ILIT management.

-- PREREQUISITES:
-- Before running this migration, you MUST set up secrets in Supabase Vault:
-- 1. supabase_project_url - Your full Supabase project URL
-- 2. supabase_service_role_key - Your service role key (never commit to git!)
--
-- See the "Setting Up Secrets" section in docs/CRON-JOBS-SETUP.md for detailed instructions.
--
-- To verify secrets are set, run:
-- SELECT name FROM vault.decrypted_secrets WHERE name IN ('supabase_project_url', 'supabase_service_role_key');

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions to use pg_cron
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Grant permissions to use vault (for reading secrets)
GRANT USAGE ON SCHEMA vault TO postgres;

-- ============================================================================
-- JOB 1: Check Premium Reminders
-- ============================================================================
-- Scans all insurance policies and creates/updates upcoming premium reminders
-- Runs daily at 8:00 AM UTC
-- Edge function: check-premium-reminders

SELECT cron.schedule(
  'check-premium-reminders-daily',      -- Job name
  '0 8 * * *',                          -- Cron expression: 8 AM UTC daily
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url')
           || '/functions/v1/check-premium-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- JOB 2: Expire Crummey Notices
-- ============================================================================
-- Marks Crummey notices as expired after 30-day withdrawal period lapses
-- Runs daily at midnight UTC (00:00)
-- Edge function: expire-crummey-notices

SELECT cron.schedule(
  'expire-crummey-notices-daily',       -- Job name
  '0 0 * * *',                          -- Cron expression: midnight UTC daily
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url')
           || '/functions/v1/expire-crummey-notices',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- JOB 3: Send Deadline Alerts
-- ============================================================================
-- Sends email alerts to trustees for approaching Crummey notice deadlines
-- Runs daily at 9:00 AM UTC
-- Edge function: send-deadline-alerts
-- Default window: 7 days (can be customized in request body)

SELECT cron.schedule(
  'send-deadline-alerts-daily',         -- Job name
  '0 9 * * *',                          -- Cron expression: 9 AM UTC daily
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url')
           || '/functions/v1/send-deadline-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('window_days', 7)
  ) AS request_id;
  $$
);

-- ============================================================================
-- Verify Cron Jobs
-- ============================================================================
-- Query to list all scheduled cron jobs (for verification)
-- Run this after migration: SELECT * FROM cron.job;

-- ============================================================================
-- Manual Unscheduling (if needed)
-- ============================================================================
-- To remove a cron job, run:
-- SELECT cron.unschedule('job-name-here');
--
-- Examples:
-- SELECT cron.unschedule('check-premium-reminders-daily');
-- SELECT cron.unschedule('expire-crummey-notices-daily');
-- SELECT cron.unschedule('send-deadline-alerts-daily');

-- ============================================================================
-- Monitoring Cron Jobs
-- ============================================================================
-- View job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- Check job status:
-- SELECT jobid, jobname, schedule, active FROM cron.job;

-- ============================================================================
-- Notes
-- ============================================================================
-- 1. Cron expressions use standard cron syntax: minute hour day month weekday
-- 2. All times are in UTC
-- 3. The net.http_post function is provided by the Supabase pg_net extension
-- 4. Edge functions must be deployed before cron jobs can call them
-- 5. Service role key bypasses RLS policies - use with caution
-- 6. Failed requests will be logged in cron.job_run_details with status and return_message
-- 7. Secrets are stored encrypted in vault.secrets and accessed via vault.decrypted_secrets
-- 8. Never commit actual secrets to git - always use Supabase Vault
