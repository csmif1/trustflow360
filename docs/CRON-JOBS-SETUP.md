# TrustFlow360 Cron Jobs Setup Guide

## Overview

TrustFlow360 uses Supabase's pg_cron extension to automatically execute compliance-related edge functions on a daily schedule. This document explains the cron job configuration, how to deploy it, and how to monitor and troubleshoot the scheduled tasks.

**🔒 Security Note:** This setup uses Supabase Vault to securely store credentials. No secrets are hardcoded in SQL migrations or committed to git.

## Quick Start Checklist

Before running the cron job migration:

- [ ] Store `supabase_project_url` in Supabase Vault
- [ ] Store `supabase_service_role_key` in Supabase Vault
- [ ] Deploy all edge functions to Supabase
- [ ] Configure `RESEND_API_KEY` for edge functions
- [ ] Run the cron job migration
- [ ] Verify cron jobs are active

Detailed instructions below.

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

### Step 1: Set Up Supabase Vault Secrets

**IMPORTANT:** Before running the cron job migration, you must store credentials in Supabase Vault. This ensures secrets are encrypted and never committed to git.

#### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard → SQL Editor
2. Run the following SQL to create the required secrets:

```sql
-- Insert project URL secret
SELECT vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'supabase_project_url',
  'Supabase project URL for cron jobs'
);

-- Insert service role key secret
SELECT vault.create_secret(
  'YOUR_SERVICE_ROLE_KEY',
  'supabase_service_role_key',
  'Service role key for authenticated cron job requests'
);
```

3. **Replace the values:**
   - `YOUR_PROJECT_REF` with your actual project reference (e.g., `abcdefghijklmnop`)
   - `YOUR_SERVICE_ROLE_KEY` with your actual service role key from Settings → API

4. Verify secrets were created:
```sql
SELECT id, name, description, created_at
FROM vault.decrypted_secrets
WHERE name IN ('supabase_project_url', 'supabase_service_role_key');
```

You should see both secrets listed (but the actual values won't be shown in this query for security).

#### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Create secrets via CLI
supabase secrets set supabase_project_url=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set supabase_service_role_key=YOUR_SERVICE_ROLE_KEY

# List secrets to verify
supabase secrets list
```

#### Finding Your Credentials

**Project URL:**
- Dashboard → Settings → API → Project URL
- Format: `https://[project-ref].supabase.co`

**Service Role Key:**
- Dashboard → Settings → API → Service Role Key (secret)
- ⚠️ This key bypasses RLS - keep it secret!

### Step 2: Configure Edge Function Secrets

Ensure the following environment variables are set for edge functions:

```bash
# In Supabase Dashboard: Settings > Edge Functions > Secrets
RESEND_API_KEY=your_resend_api_key_here
SUPABASE_URL=https://your_project_ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Deploy Edge Functions

Deploy all edge functions to Supabase:

```bash
# Deploy check-premium-reminders
supabase functions deploy check-premium-reminders

# Deploy expire-crummey-notices
supabase functions deploy expire-crummey-notices

# Deploy send-deadline-alerts
supabase functions deploy send-deadline-alerts
```

### Step 4: Run the Cron Job Migration

Now that secrets are configured, apply the migration to your Supabase database:

```bash
supabase db push
```

Or manually run the SQL in the Supabase SQL Editor.

**Note:** The migration now automatically reads credentials from Supabase Vault, so there's no need to edit the SQL file with your credentials.

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

## Managing Vault Secrets

### Viewing Secrets

To view which secrets exist (without seeing their values):

```sql
SELECT id, name, description, created_at
FROM vault.decrypted_secrets;
```

### Updating Secrets

If you need to update a secret (e.g., after rotating your service role key):

```sql
-- First, delete the old secret
DELETE FROM vault.secrets WHERE name = 'supabase_service_role_key';

-- Then create the new secret
SELECT vault.create_secret(
  'YOUR_NEW_SERVICE_ROLE_KEY',
  'supabase_service_role_key',
  'Service role key for authenticated cron job requests'
);
```

**Note:** After updating secrets, cron jobs will automatically use the new values on their next execution. No need to recreate the cron jobs.

### Deleting Secrets

To remove a secret from the vault:

```sql
DELETE FROM vault.secrets WHERE name = 'secret_name_here';
```

### Backing Up Secrets

⚠️ **Important:** Vault secrets are encrypted in the database. Before making changes:

1. Store credentials in a secure password manager (1Password, LastPass, etc.)
2. Never commit actual credentials to git
3. Document which secrets are required in this file

## Security Considerations

1. **Vault Security:** All secrets in Supabase Vault are encrypted at rest. Access requires database credentials.

2. **Service Role Key:** Never commit service role keys to version control. Always use Supabase Vault or environment variables.

3. **Access Control:** Service role key bypasses Row Level Security (RLS). Ensure edge functions validate inputs properly.

4. **Key Rotation:** Rotate service role keys periodically. Update vault secrets after rotation.

5. **Rate Limiting:** Consider implementing rate limiting in edge functions to prevent abuse if keys are compromised.

6. **Email Quotas:** Monitor Resend API usage to avoid hitting sending limits.

7. **Audit Trail:** Monitor `cron.job_run_details` and `email_logs` tables for suspicious activity.

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
