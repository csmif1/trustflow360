# Supabase Vault Setup Walkthrough

This guide walks you through setting up Supabase Vault secrets for the TrustFlow360 cron jobs, step-by-step.

## What You'll Need

Before starting, gather these credentials:

1. **Supabase Project URL**
   - Location: Supabase Dashboard → Settings → API → Project URL
   - Format: `https://[project-ref].supabase.co`
   - Example: `https://abcdefghijklmnop.supabase.co`

2. **Supabase Service Role Key**
   - Location: Supabase Dashboard → Settings → API → Service Role Key
   - Format: Long JWT token starting with `eyJ...`
   - ⚠️ **Keep this secret!** It bypasses all security policies

## Step-by-Step Setup

### Step 1: Open Supabase SQL Editor

1. Log into your Supabase Dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query** to create a blank SQL script

### Step 2: Create Project URL Secret

Copy and paste this SQL, replacing `YOUR_PROJECT_REF` with your actual project reference:

```sql
SELECT vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'supabase_project_url',
  'Supabase project URL for cron jobs'
);
```

**Example with real values:**
```sql
SELECT vault.create_secret(
  'https://abcdefghijklmnop.supabase.co',
  'supabase_project_url',
  'Supabase project URL for cron jobs'
);
```

Click **Run** or press `Ctrl+Enter` (Cmd+Enter on Mac).

You should see: `create_secret: [secret-id]`

### Step 3: Create Service Role Key Secret

Copy and paste this SQL, replacing `YOUR_SERVICE_ROLE_KEY` with your actual service role key:

```sql
SELECT vault.create_secret(
  'YOUR_SERVICE_ROLE_KEY',
  'supabase_service_role_key',
  'Service role key for authenticated cron job requests'
);
```

**Example with real values:**
```sql
SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk4MDAwMDAwLCJleHAiOjE4NTU4NTAwMDB9.example-signature-here',
  'supabase_service_role_key',
  'Service role key for authenticated cron job requests'
);
```

Click **Run** or press `Ctrl+Enter` (Cmd+Enter on Mac).

You should see: `create_secret: [secret-id]`

### Step 4: Verify Secrets Were Created

Run this verification query:

```sql
SELECT id, name, description, created_at
FROM vault.decrypted_secrets
WHERE name IN ('supabase_project_url', 'supabase_service_role_key');
```

You should see both secrets listed:

| id | name | description | created_at |
|----|------|-------------|------------|
| 1  | supabase_project_url | Supabase project URL for cron jobs | 2026-01-22... |
| 2  | supabase_service_role_key | Service role key for authenticated... | 2026-01-22... |

**Note:** The actual secret values are encrypted and won't be displayed in query results. This is normal and secure.

### Step 5: Test Secret Access

To confirm the cron jobs can access the secrets, run:

```sql
SELECT
  (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url') AS project_url,
  CASE
    WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key') IS NOT NULL
    THEN '✓ Key exists (value hidden for security)'
    ELSE '✗ Key not found'
  END AS service_key_status;
```

Expected output:
```
project_url: https://abcdefghijklmnop.supabase.co
service_key_status: ✓ Key exists (value hidden for security)
```

### Step 6: You're Done!

✅ Secrets are now configured in Supabase Vault

Next steps:
1. Deploy your edge functions: `supabase functions deploy [function-name]`
2. Run the cron job migration: `supabase db push`
3. Verify cron jobs are active: See CRON-JOBS-SETUP.md

## Troubleshooting

### Error: "relation vault.secrets does not exist"

**Cause:** Vault extension not enabled

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS supabase_vault;
```

### Error: "permission denied for schema vault"

**Cause:** User doesn't have vault permissions

**Solution:** Run as postgres user or contact Supabase support

### Secret Not Found After Creation

**Cause:** Typo in secret name

**Solution:**
1. List all secrets: `SELECT name FROM vault.decrypted_secrets;`
2. Delete incorrect secret: `DELETE FROM vault.secrets WHERE name = 'wrong_name';`
3. Recreate with correct name

### Need to Update a Secret?

If you need to change a secret value (e.g., after key rotation):

```sql
-- Delete old secret
DELETE FROM vault.secrets WHERE name = 'supabase_service_role_key';

-- Create new secret with updated value
SELECT vault.create_secret(
  'YOUR_NEW_SERVICE_ROLE_KEY',
  'supabase_service_role_key',
  'Service role key for authenticated cron job requests'
);
```

Cron jobs will automatically use the new value on their next execution.

## Security Best Practices

✅ **DO:**
- Store credentials in Supabase Vault
- Use a password manager for backup (1Password, LastPass, etc.)
- Rotate service role keys periodically
- Monitor `cron.job_run_details` for suspicious activity

❌ **DON'T:**
- Commit secrets to git
- Share service role keys via email/Slack
- Hardcode secrets in SQL files
- Use the service role key in client-side code

## Alternative: Using Supabase CLI

If you prefer the command line:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to your project
supabase login

# Set secrets
supabase secrets set supabase_project_url=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set supabase_service_role_key=YOUR_SERVICE_ROLE_KEY

# Verify
supabase secrets list
```

## Next Steps

Once secrets are configured, proceed with:
- **Deploy edge functions** → See CRON-JOBS-SETUP.md Step 3
- **Run cron job migration** → See CRON-JOBS-SETUP.md Step 4
- **Verify installation** → See CRON-JOBS-SETUP.md Step 5

---

**Last Updated:** 2026-01-22
**Related Docs:** CRON-JOBS-SETUP.md, SPRINT-2-SPEC.md
