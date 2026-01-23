# Scheduled Policy Health Checks

**Last Updated:** January 24, 2026
**Sprint:** 3 - Task 5
**Purpose:** Automated daily health monitoring for all active policies

---

## Overview

The scheduled health check system automatically runs policy health analyses every day at **2 AM ET (7 AM UTC)** to proactively identify issues before they become critical.

### Key Features

1. **Batch Processing** - Handles 800+ policies efficiently with delays to prevent API overload
2. **Smart Prioritization** - Checks urgent policies first (upcoming premiums, never checked)
3. **Duplicate Prevention** - Skips policies checked within last 24 hours
4. **Automatic Remediation** - Creates action items and sends emails for critical issues
5. **Audit Logging** - Records all checks to `ai_processing_log` for compliance
6. **Error Handling** - Graceful failure recovery with detailed error reporting

---

## Architecture

```
┌─────────────────┐
│   pg_cron       │  Daily at 7 AM UTC
│   (Supabase)    │  Triggers HTTP POST
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  run-scheduled-health-checks            │
│  (Edge Function)                        │
│                                         │
│  1. Fetch all active policies          │
│  2. Filter recently checked (24h)      │
│  3. Prioritize (urgent→high→med→low)   │
│  4. Batch process (50 per batch)       │
│  5. Log results to ai_processing_log   │
│  6. Return summary                     │
└────────┬────────────────────────────────┘
         │
         ├──► analyze-policy-health (per policy)
         │     ├──► AI Analysis (Gemini)
         │     ├──► Create health_check record
         │     ├──► Create remediation_actions
         │     └──► Send email alerts
         │
         └──► Summary Report (JSON)
```

---

## Priority Logic

Policies are checked in this priority order:

### 🔴 Urgent (Checked First)
- Premiums due within 7 days
- Policy in grace period
- Critical status from last check

### 🟠 High
- Premiums due in 7-30 days
- Never been checked before
- Warning status from last check

### 🟡 Medium
- Not checked in > 90 days
- New policies (first check)

### 🟢 Low
- Regular scheduled maintenance
- All other active policies

---

## Batch Processing

### Configuration

```typescript
BATCH_SIZE = 50              // Policies per batch
BATCH_DELAY_MS = 2000        // 2 seconds between batches
INTRA_BATCH_DELAY_MS = 500   // 0.5 seconds between checks within batch
```

### Example Execution

**Portfolio:** 250 active policies
**Batches:** 5 batches × 50 policies
**Total Time:** ~10-15 minutes

```
Batch 1: Policies 1-50    (50 checks × 0.5s + 2s delay) = ~27s
Batch 2: Policies 51-100  (50 checks × 0.5s + 2s delay) = ~27s
Batch 3: Policies 101-150 (50 checks × 0.5s + 2s delay) = ~27s
Batch 4: Policies 151-200 (50 checks × 0.5s + 2s delay) = ~27s
Batch 5: Policies 201-250 (50 checks × 0.5s)           = ~25s
─────────────────────────────────────────────────────────────
Total: ~133 seconds (~2.2 minutes) + API processing time
```

For 800 policies: ~16 batches = ~7-10 minutes total

---

## Database Schema

### cron_execution_log

Tracks all cron job executions:

```sql
CREATE TABLE cron_execution_log (
  id UUID PRIMARY KEY,
  job_name TEXT NOT NULL,
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('success', 'failed', 'running')),
  result JSONB,
  error_message TEXT,
  execution_duration_ms INTEGER
);
```

### ai_processing_log

Stores individual health check results:

```sql
INSERT INTO ai_processing_log (
  entity_type,        -- 'policy_health'
  entity_id,          -- policy UUID
  model_name,         -- 'gemini-2.5-flash'
  ai_response,        -- Full health check result
  confidence_score,   -- AI confidence (0-1)
  success,            -- true/false
  error_message       -- if failed
);
```

---

## Setup Instructions

### 1. Apply Migration

```bash
npx supabase db push
```

This will:
- Enable `pg_cron` extension
- Enable `pg_net` extension
- Create `cron_execution_log` table
- Schedule daily health check cron job at 7 AM UTC

### 2. Verify Cron Job

```sql
SELECT
  jobid,
  schedule,
  command,
  nodename,
  active,
  jobname
FROM cron.job
WHERE jobname = 'daily-policy-health-checks';
```

Expected output:
```
jobid | schedule    | active | jobname
------|-------------|--------|-------------------------
1     | 0 7 * * *   | true   | daily-policy-health-checks
```

### 3. Configure Service Role Key

The cron job needs access to the service role key. In Supabase:

1. Go to **Settings** → **API**
2. Copy the **service_role** secret key
3. Go to **Database** → **Extensions** → **Vault**
4. Add secret: `app.settings.service_role_key` = `[YOUR_SERVICE_ROLE_KEY]`

### 4. Test Manual Execution

```sql
SELECT net.http_post(
  url := 'https://fnivqabphgbmkzpwowwg.supabase.co/functions/v1/run-scheduled-health-checks',
  headers := jsonb_build_object(
    'Authorization', 'Bearer [SERVICE_ROLE_KEY]',
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object('trigger', 'manual')
);
```

---

## Monitoring

### Check Recent Executions

```sql
SELECT
  job_name,
  execution_time,
  status,
  result->'checks_run' as checks_run,
  result->'checks_successful' as successful,
  result->'critical_count' as critical,
  execution_duration_ms / 1000.0 as duration_seconds
FROM cron_execution_log
WHERE job_name = 'daily-policy-health-checks'
ORDER BY execution_time DESC
LIMIT 10;
```

### Check AI Processing Logs

```sql
SELECT
  entity_id,
  model_name,
  success,
  confidence_score,
  ai_response->'overall_status' as status,
  ai_response->'health_score' as score,
  created_at
FROM ai_processing_log
WHERE entity_type = 'policy_health'
  AND check_trigger = 'scheduled'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Check Remediation Actions Created

```sql
SELECT
  COUNT(*) as total_actions,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent,
  COUNT(*) FILTER (WHERE priority = 'high') as high,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE email_alert_sent = true) as emails_sent
FROM remediation_actions
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## Troubleshooting

### Cron Job Not Running

**Problem:** No executions in `cron_execution_log`

**Solutions:**
1. Check if cron job is active:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'daily-policy-health-checks';
   ```
2. Check cron extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```
3. Check Supabase logs for errors

### High Failure Rate

**Problem:** Many checks failing in `ai_processing_log`

**Solutions:**
1. Check Gemini API key is valid
2. Check RESEND_API_KEY is configured
3. Review error messages in logs:
   ```sql
   SELECT error_message, COUNT(*)
   FROM ai_processing_log
   WHERE success = false
   GROUP BY error_message;
   ```

### Performance Issues

**Problem:** Batch processing taking too long

**Solutions:**
1. Increase `BATCH_SIZE` (current: 50)
2. Decrease `INTRA_BATCH_DELAY_MS` (current: 500ms)
3. Add more compute resources to edge functions
4. Consider splitting into multiple cron jobs by priority

---

## Adjusting Schedule

### Change to Different Time

Edit the cron schedule in migration file:

```sql
-- Current: 7 AM UTC (2 AM ET during EST)
'0 7 * * *'

-- Examples:
'0 6 * * *'   -- 6 AM UTC (2 AM ET during EDT)
'0 12 * * *'  -- 12 PM UTC (7 AM ET during EST)
'0 0 * * *'   -- Midnight UTC
```

### Multiple Daily Runs

```sql
-- Run every 6 hours
'0 */6 * * *'

-- Run at 2 AM and 2 PM ET
SELECT cron.schedule('morning-health-checks', '0 7 * * *', $$...$$);
SELECT cron.schedule('afternoon-health-checks', '0 19 * * *', $$...$$);
```

---

## Future Enhancements

### Planned for Future Sprints

1. **Summary Email Report**
   - Daily digest to admin with statistics
   - Highlight critical issues requiring attention
   - Trend analysis (improving/declining)

2. **Adaptive Scheduling**
   - More frequent checks for high-risk policies
   - Reduce frequency for consistently healthy policies
   - Smart retry logic for failed checks

3. **Performance Optimization**
   - Parallel batch processing
   - Cached AI analysis for similar policies
   - Incremental checks (only changed data)

4. **Advanced Monitoring**
   - Real-time dashboard for cron execution
   - Alerting for job failures
   - Performance metrics and trends

---

## API Response Format

```typescript
interface ScheduledCheckResult {
  success: boolean;
  total_policies: number;           // All active policies
  policies_eligible: number;        // After filtering recent checks
  checks_run: number;               // Total attempted
  checks_successful: number;        // Completed successfully
  checks_failed: number;            // Failed with errors
  healthy_count: number;            // Status: healthy
  warning_count: number;            // Status: warning
  critical_count: number;           // Status: critical
  remediations_created: number;     // Total actions created
  execution_time_ms: number;        // Total runtime
  timestamp: string;                // ISO 8601 timestamp
  errors: string[];                 // Error messages
}
```

### Example Response

```json
{
  "success": true,
  "total_policies": 250,
  "policies_eligible": 185,
  "checks_run": 185,
  "checks_successful": 182,
  "checks_failed": 3,
  "healthy_count": 150,
  "warning_count": 25,
  "critical_count": 7,
  "remediations_created": 12,
  "execution_time_ms": 133542,
  "timestamp": "2026-01-24T07:00:00.000Z",
  "errors": [
    "Failed to check NWM-2019-847562: Gemini API timeout",
    "Failed to check MET-2020-123456: Network error",
    "Failed to check PRU-2021-789012: Invalid policy data"
  ]
}
```

---

## Support

For issues or questions:
1. Check logs in `cron_execution_log` and `ai_processing_log`
2. Review error messages in this documentation
3. Contact DevOps team for infrastructure issues
4. File bug report with execution summary attached
