# TrustFlow360 Cron Jobs Setup Guide

## Overview

TrustFlow360 uses Supabase's pg_cron extension to automatically execute compliance-related edge functions on a daily schedule. This document explains the cron job configuration, how to deploy it, and how to monitor and troubleshoot the scheduled tasks.

## Scheduled Jobs

### 1. Check Premium Reminders
**Function:** `check-premium-reminders`
**Schedule:** Daily at 8:00 AM UTC
**Cron Expression:** `0 8 * * *`
**Purpose:** Scans all insurance policies and creates/updates records in `upcoming_premiums` table for premiums due within 90 days

### 2. Expire Crummey Notices
**Function:** `expire-crummey-notices`
**Schedule:** Daily at midnight UTC (00:00)
**Cron Expression:** `0 0 * * *`
**Purpose:** Marks Crummey notices as 'expired' after the 30-day withdrawal period has lapsed

### 3. Send Deadline Alerts
**Function:** `send-deadline-alerts`
**Schedule:** Daily at 9:00 AM UTC
**Cron Expression:** `0 9 * * *`
**Purpose:** Sends email alerts to trustees for Crummey notices expiring within 7 days

## Prerequisites

1. **Supabase Project:** Active Supabase project with pg_cron extension enabled
2. **Edge Functions Deployed:** All three edge functions must be deployed to Supabase
3. **Service Role Key:** Supabase service role key (found in project settings)
4. **Email Configuration:** Resend API key configured in edge function secrets

## Deployment Steps

### Step 1: Configure Environment Variables

Ensure the following environment variables are set in your Supabase project:

```bash
# In Supabase Dashboard: Settings > Edge Functions > Secrets
RESEND_API_KEY=your_resend_api_key_here
SUPABASE_URL=https://your_project_ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 2: Deploy Edge Functions

Deploy all edge functions to Supabase:

```bash
# Deploy check-premium-reminders
supabase functions deploy check-premium-reminders

# Deploy expire-crummey-notices
supabase functions deploy expire-crummey-notices

# Deploy send-deadline-alerts
supabase functions deploy send-deadline-alerts
```

### Step 3: Update Migration File

Edit `supabase/migrations/20260122_setup_cron_jobs.sql`:

1. Replace `YOUR_PROJECT_REF` with your Supabase project reference (e.g., `abcdefghijklmnop`)
2. Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key

**Example:**
```sql
url := 'https://abcdefghijklmnop.supabase.co/functions/v1/check-premium-reminders',
headers := jsonb_build_object(
  'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Content-Type', 'application/json'
),
```

### Step 4: Run Migration

Apply the migration to your Supabase database:

```bash
supabase db push
```

Or manually run the SQL in the Supabase SQL Editor.

### Step 5: Verify Installation

Check that cron jobs are scheduled:

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname LIKE '%daily%';
```

Expected output:
```
 jobid |           jobname            | schedule  | active
-------+------------------------------+-----------+--------
     1 | check-premium-reminders-daily| 0 8 * * * | t
     2 | expire-crummey-notices-daily | 0 0 * * * | t
     3 | send-deadline-alerts-daily   | 0 9 * * * | t
```

## Manual Triggering

For testing or immediate execution, trigger edge functions manually:

```bash
# Using curl
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-premium-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-crummey-notices \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-deadline-alerts \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"window_days": 7}'
```

## Monitoring

### View Recent Job Executions

```sql
SELECT
  job_run_details.jobid,
  cron.job.jobname,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
JOIN cron.job ON cron.job.jobid = cron.job_run_details.jobid
ORDER BY start_time DESC
LIMIT 20;
```

### Check Email Logs

Monitor sent emails via the `email_logs` table:

```sql
SELECT
  sent_at,
  recipient_email,
  subject,
  status,
  error_message
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
ORDER BY sent_at DESC;
```

### Check for Failed Jobs

```sql
SELECT
  jobname,
  start_time,
  status,
  return_message
FROM cron.job_run_details
JOIN cron.job ON cron.job.jobid = cron.job_run_details.jobid
WHERE status = 'failed'
ORDER BY start_time DESC;
```

## Troubleshooting

### Job Not Running

1. **Check if job is active:**
   ```sql
   SELECT * FROM cron.job WHERE active = false;
   ```

2. **Re-enable inactive job:**
   ```sql
   UPDATE cron.job SET active = true WHERE jobname = 'job-name-here';
   ```

### Job Failing

1. **Check error logs:**
   ```sql
   SELECT return_message
   FROM cron.job_run_details
   WHERE status = 'failed'
   ORDER BY start_time DESC
   LIMIT 5;
   ```

2. **Common issues:**
   - Invalid service role key
   - Edge function not deployed
   - Missing environment variables
   - Network connectivity issues

3. **Test edge function directly:**
   ```bash
   curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/function-name \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

### Emails Not Sending

1. **Check Resend API key:**
   - Verify key is set in edge function secrets
   - Check Resend dashboard for delivery status

2. **Check email logs:**
   ```sql
   SELECT * FROM email_logs WHERE status = 'failed';
   ```

## Unscheduling Jobs

To temporarily or permanently remove a cron job:

```sql
-- Unschedule a specific job
SELECT cron.unschedule('check-premium-reminders-daily');
SELECT cron.unschedule('expire-crummey-notices-daily');
SELECT cron.unschedule('send-deadline-alerts-daily');

-- Or disable without unscheduling
UPDATE cron.job SET active = false WHERE jobname = 'job-name-here';
```

## Cron Expression Reference

Cron expressions use the format: `minute hour day month weekday`

Examples:
- `0 8 * * *` - Daily at 8:00 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 1` - Every Monday at midnight
- `30 14 1 * *` - First day of month at 2:30 PM

All times are in UTC. Convert local times to UTC when scheduling.

## Security Considerations

1. **Service Role Key:** Never commit service role keys to version control. Use environment variables or Supabase secrets.

2. **Access Control:** Service role key bypasses Row Level Security (RLS). Ensure edge functions validate inputs properly.

3. **Rate Limiting:** Consider implementing rate limiting in edge functions to prevent abuse if keys are compromised.

4. **Email Quotas:** Monitor Resend API usage to avoid hitting sending limits.

## Customization

### Change Schedule

To modify a job's schedule:

```sql
-- Unschedule existing job
SELECT cron.unschedule('send-deadline-alerts-daily');

-- Reschedule with new time (e.g., 10 AM instead of 9 AM)
SELECT cron.schedule(
  'send-deadline-alerts-daily',
  '0 10 * * *',  -- New schedule
  $$ ... $$      -- Same function call
);
```

### Change Alert Window

Modify the `window_days` parameter in the `send-deadline-alerts` job body:

```sql
body := jsonb_build_object('window_days', 14)  -- 14 days instead of 7
```

## Support

For issues or questions:
- Check edge function logs in Supabase Dashboard
- Review `email_logs` table for email delivery issues
- Consult Supabase documentation: https://supabase.com/docs/guides/database/extensions/pg_cron

---

**Last Updated:** 2026-01-22
**Sprint:** Sprint 2 - SPRINT2-004
