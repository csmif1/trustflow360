# TrustFlow360 Schema Reference

**Last Updated:** January 23, 2026
**Purpose:** Document actual production schema relationships to prevent confusion

---

## Core Tables & Relationships

### User Access Pattern
All data access flows through: `trusts.user_id = auth.uid()`

**CRITICAL:** The production schema uses `user_id`, NOT `attorney_id`

### Table Relationships

```
trusts (THIS IS THE ILIT TABLE)
  ├── user_id → auth.users(id)          [Access control]
  ├── insurance_policies (via trust_id)
  │   ├── premium_payments
  │   ├── upcoming_premiums
  │   └── policy_health_checks (Sprint 3)
  ├── upcoming_premiums (via trust_id)
  ├── fund_sufficiency_checks
  ├── crummey_notices
  │   └── email_logs
  ├── beneficiaries
  └── gifts
      └── crummey_notices
```

---

## Important Schema Facts

### ❌ COMMON MISTAKES

1. **There is NO separate `ilits` table**
   - The `trusts` table IS the ILIT table
   - Trust type is stored in `trusts.trust_type` (typically 'ILIT')

2. **Access control uses `user_id` NOT `attorney_id`**
   - Correct: `trusts.user_id = auth.uid()`
   - Wrong: `trusts.attorney_id = auth.uid()`

3. **Policies reference trusts directly**
   - Correct: `insurance_policies.trust_id → trusts.id`
   - Wrong: `insurance_policies.ilit_id → ilits.id`

### ✅ CORRECT PATTERNS

**Joining policies to trusts:**
```sql
SELECT * FROM insurance_policies
JOIN trusts ON trusts.id = insurance_policies.trust_id
WHERE trusts.user_id = auth.uid()
```

**Using PostgREST nested select:**
```typescript
const { data } = await supabase
  .from('insurance_policies')
  .select(`
    *,
    trusts!inner(
      id,
      trust_name,
      trustee_name,
      trustee_email,
      user_id
    )
  `)
  .eq('trusts.user_id', userId)
```

**RLS Policy Pattern:**
```sql
CREATE POLICY "Users can view their data"
  ON table_name FOR SELECT
  USING (
    trust_id IN (
      SELECT id FROM trusts WHERE user_id = auth.uid()
    )
  );
```

---

## Table Schemas

### trusts
**The primary ILIT table**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | **Access control** - references auth.users(id) |
| grantor_name | TEXT | Person creating/funding the trust |
| trust_name | TEXT | Legal name of trust |
| trust_date | DATE | Date trust established |
| trust_type | TEXT | Usually 'ILIT' |
| status | TEXT | 'active', 'inactive', etc. |
| trustee_name | TEXT | Person managing the trust |
| trustee_email | TEXT | Trustee contact email |
| ein | TEXT | Tax ID (XX-XXXXXXX format) |
| crm_reference | TEXT | External CRM reference |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

### insurance_policies

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| trust_id | UUID | **References trusts.id** (NOT ilits.id) |
| policy_number | TEXT | Unique policy identifier |
| carrier | TEXT | Insurance company name |
| policy_type | TEXT | Type of insurance policy |
| insured_name | TEXT | Person whose life is insured |
| insured_dob | DATE | Insured date of birth |
| death_benefit | DECIMAL | Policy death benefit amount |
| cash_value | DECIMAL | Current cash value |
| annual_premium | DECIMAL | Annual premium amount |
| premium_frequency | TEXT | 'annual', 'monthly', etc. |
| premium_due_date | DATE | When premium is due |
| next_premium_due | DATE | Next premium due date |
| policy_status | TEXT | 'active', 'grace_period', 'lapsed' |
| issue_date | DATE | Policy issue date |
| policy_owner | TEXT | Who owns the policy (should be trust) |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

### policy_health_checks (Sprint 3)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| policy_id | UUID | References insurance_policies.id |
| trust_id | UUID | **References trusts.id** (NOT ilit_id) |
| check_date | DATE | Date of health check |
| overall_status | TEXT | 'healthy', 'warning', 'critical' |
| health_score | NUMERIC(5,2) | 0-100 score |
| component_scores | JSONB | Breakdown by component |
| premium_payment_status | TEXT | Payment status |
| coverage_adequacy_score | NUMERIC(5,2) | Coverage score |
| ai_analysis_summary | TEXT | AI-generated summary |
| ai_model_version | TEXT | AI model used |
| ai_confidence_score | NUMERIC(5,4) | 0-1 AI confidence |
| issues_detected | JSONB | Array of issues |
| recommendations | JSONB | Array of recommendations |
| remediation_required | BOOLEAN | Whether action needed |
| remediation_priority | TEXT | 'low', 'medium', 'high', 'urgent' |
| remediation_status | TEXT | Current remediation status |
| check_trigger | TEXT | 'manual', 'scheduled', 'alert' |
| checked_by | UUID | User who ran check |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

### beneficiaries

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| trust_id | UUID | References trusts.id |
| name | TEXT | Beneficiary name |
| email | TEXT | Contact email |
| relationship | TEXT | Relationship to grantor |
| share_percentage | DECIMAL | Percentage share |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

### crummey_notices

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| trust_id | UUID | References trusts.id |
| gift_id | UUID | References gifts.id |
| beneficiary_id | UUID | References beneficiaries.id |
| notice_date | DATE | Date notice sent |
| withdrawal_deadline | DATE | Deadline for withdrawal |
| withdrawal_amount | DECIMAL | Amount available for withdrawal |
| notice_status | TEXT | 'pending', 'sent', 'expired' |
| acknowledged_at | TIMESTAMP | When beneficiary acknowledged |
| sent_at | TIMESTAMP | When notice was sent |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

---

## Row Level Security (RLS) Patterns

All tables with `trust_id` use this pattern:

```sql
CREATE POLICY "Users can view [table_name]"
  ON [table_name] FOR SELECT
  USING (
    trust_id IN (
      SELECT id FROM trusts WHERE user_id = auth.uid()
    )
  );
```

**Service role bypasses RLS:**
```sql
CREATE POLICY "Service role can manage [table_name]"
  ON [table_name] FOR ALL
  USING (true);  -- Service role always has access
```

---

## Edge Function Data Access

When writing edge functions, use the **service role key** to bypass RLS:

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  // NOT ANON_KEY
)
```

This allows the function to access all data for processing, while RLS protects client-side access.

---

## Migration Patterns

### Adding a table that references trusts:

```sql
CREATE TABLE new_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trust_id UUID NOT NULL REFERENCES trusts(id) ON DELETE CASCADE,
  -- other columns...
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_new_table_trust ON new_table(trust_id);

-- Add RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view new_table"
  ON new_table FOR SELECT
  USING (
    trust_id IN (
      SELECT id FROM trusts WHERE user_id = auth.uid()
    )
  );
```

### Adding a table that references policies:

```sql
CREATE TABLE new_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  -- other columns...
);

-- RLS via policy -> trust chain
CREATE POLICY "Users can view new_table"
  ON new_table FOR SELECT
  USING (
    policy_id IN (
      SELECT id FROM insurance_policies WHERE trust_id IN (
        SELECT id FROM trusts WHERE user_id = auth.uid()
      )
    )
  );
```

---

## Verification Queries

Run these queries to verify schema understanding:

```sql
-- 1. Check trusts table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'trusts'
ORDER BY ordinal_position;

-- 2. Verify trust_id foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'trusts';

-- 3. Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN (
  'trusts',
  'insurance_policies',
  'policy_health_checks',
  'remediation_actions'
)
ORDER BY tablename, policyname;
```

---

## Common Debugging Steps

### "relation ilits does not exist"
**Problem:** Code is referencing a non-existent `ilits` table
**Solution:** Use `trusts` table instead

### "column attorney_id does not exist"
**Problem:** Code is using wrong column name for access control
**Solution:** Use `user_id` instead of `attorney_id`

### "foreign key constraint policy_health_checks_ilit_id_fkey"
**Problem:** Table schema references `ilit_id` instead of `trust_id`
**Solution:** Update column name to `trust_id` and foreign key to reference `trusts.id`

### RLS blocking queries
**Problem:** Service role queries failing due to RLS
**Solution:** Ensure edge functions use `SUPABASE_SERVICE_ROLE_KEY`, not `ANON_KEY`

---

## Schema Evolution Notes

### Sprint 1-2 Schema
- Core tables: trusts, insurance_policies, premium_payments, crummey_notices
- Access pattern: `trusts.user_id = auth.uid()`

### Sprint 3 Additions (AI Health Monitoring)
- Added: `ai_processing_log`, `ai_prediction_feedback`
- Added: `policy_health_checks`, `remediation_actions`
- Added: `health_check_templates`
- **Key fix:** Changed `ilit_id` to `trust_id` in policy_health_checks

### Future Considerations
- If separate ILIT table is needed, would require major schema migration
- Current pattern (trust_type field) is simpler and working well
- Any new tables should follow the established `trust_id` pattern

---

## Quick Reference: Sprint 3 Health Check Query

```typescript
// Correct way to fetch policy with trust info
const { data: policy } = await supabase
  .from('insurance_policies')
  .select(`
    *,
    trusts!inner(
      id,
      trust_name,
      trustee_name,
      trustee_email,
      user_id
    )
  `)
  .eq('id', policyId)
  .single()

// Access trust data
const trust = policy.trusts
const trustName = trust.trust_name
const trusteeEmail = trust.trustee_email
```

---

## Questions?

If schema relationships are unclear:
1. Check this document first
2. Query production schema directly (see Verification Queries)
3. Review migration files in `supabase/migrations/`
4. Check existing edge functions for patterns

**Never assume** - always verify against production schema!
