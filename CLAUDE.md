# Claude Code Development Guide for TrustFlow360

**Last Updated:** January 26, 2026
**Latest Commit:** `07eb079` - "Fix AuditTrailExport crash: add null check for success_rate.toFixed()"
**Project Status:** PVD V1 Complete - E2E Tested & Production Ready

---

## Quick Reference

### Project Structure
```
trustflow360/
├── src/
│   ├── pages/attorney/          # Attorney dashboard and views
│   ├── components/              # Reusable UI components
│   │   └── Reports/            # Reporting components
│   └── App.tsx                 # React router configuration
├── supabase/
│   ├── functions/              # 18 Edge Functions (Deno)
│   │   └── _shared/           # Shared email templates
│   └── migrations/            # Database schema migrations
└── docs/                       # Project documentation
```

### Key Files
- **Main Dashboard:** `src/pages/attorney/Dashboard.tsx`
- **Edge Functions:** `supabase/functions/*/index.ts`
- **Schema Migrations:** `supabase/migrations/*.sql`
- **Progress Tracking:** `docs/V1-PROGRESS.md`

---

## Current Status (January 26, 2026)

### PVD V1: 100% Complete ✅

All 8 phases implemented and tested:
1. ✅ Premium Alert (Full)
2. ✅ Gift Coordination (Full)
3. ✅ Crummey Compliance (Full)
4. ✅ Withdrawal Lapse (Full)
5. ✅ Premium Payment (Basic)
6. ✅ Policy Health Check (AI-Powered with Gemini 2.5 Flash)
7. ✅ Remediation Workflow (Light)
8. ✅ Reporting (Basic)

### Recent Achievements
- **E2E Testing Complete:** All critical bugs fixed (Jan 26, 2026)
- **Production Ready:** No blocking issues
- **18 Edge Functions:** All deployed and functional
- **Full UI:** Attorney dashboard with 8 tabs covering all workflows

---

## Important Patterns & Lessons Learned

### 1. CORS Headers (CRITICAL)
**Pattern:** All edge functions MUST include complete CORS headers

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',  // ⚠️ REQUIRED
};
```

**Why:** Missing `Access-Control-Allow-Methods` causes CORS errors from frontend
**Fixed:** All 17 functions updated on Jan 26, 2026 (commit `79b1f76`)

### 2. Database Column Names
**Pattern:** Always verify actual column names in schema before querying

**Common Mistakes:**
- ❌ `carrier_name` → ✅ `carrier`
- ❌ `next_premium_due` → ✅ `next_premium_date`

**How to Avoid:**
1. Check migration files first: `supabase/migrations/*.sql`
2. Use Supabase dashboard to verify schema
3. Test queries before deploying functions

**Fixed:** `assign-action` function (commit `8f14a6e`)

### 3. Schema Relationships
**Pattern:** Follow the actual foreign key relationships in the database

**Example: Gifts Table**
```typescript
// ❌ WRONG - gifts doesn't have direct relationships
gifts → beneficiaries (NO RELATIONSHIP)
gifts → trusts (NO RELATIONSHIP)

// ✅ CORRECT - follow the foreign keys
gifts → ilits → trusts
```

**Why This Matters:**
- `gifts` table has `ilit_id` (not `trust_id`)
- `ilits` table references `trusts` table
- Beneficiaries are linked to trusts, not individual gifts

**Fixed:** `gift-tax-summary` function (commit `5893f1a`)

### 4. Null Safety
**Pattern:** Always check for null/undefined before calling methods

```typescript
// ❌ WRONG - crashes if value is null
{summary.success_rate.toFixed(1)}%

// ✅ CORRECT - uses nullish coalescing
{(summary.success_rate ?? 0).toFixed(1)}%
```

**Why:** API responses may return null for calculated fields
**Fixed:** `AuditTrailExport` component (commit `07eb079`)

### 5. Email Sender Addresses
**Pattern:** Use verified Resend domain for all transactional emails

```typescript
// ✅ CORRECT - Resend verified domain
from: 'TrustFlow360 <onboarding@resend.dev>'

// ❌ WRONG - Custom domain (not verified)
from: 'TrustFlow360 <alerts@trustflow360.com>'
```

**Environment:** Resend API key stored in Supabase secrets
**Fixed:** `analyze-policy-health` function (commit `79b1f76`)

### 6. Route Management
**Pattern:** Verify routes exist in App.tsx before linking to them

**Routes That Exist:**
- `/` → AttorneyDashboard
- `/trust/:trustId` → TrustDashboard (note: singular)

**Routes That DON'T Exist:**
- ❌ `/trusts` (plural - causes blank page)
- ❌ `/compliance` (not implemented)
- ❌ `/documents` (not implemented)

**Fixed:** Removed `/trusts` navigation links (commit `d714012`)

---

## Edge Functions Reference

### 18 Deployed Functions

| Function | Purpose | Phase | Status |
|----------|---------|-------|--------|
| `check-premium-reminders` | 90-day premium alerts | 1 | ✅ |
| `calculate-funds-sufficiency` | Trust underfunding checks | 1 | ✅ |
| `gift-request-generator` | Generate gift request letters | 2 | ✅ |
| `record-gift` | Record gift receipts | 2 | ✅ |
| `generate-crummey-notice` | Send Crummey notices | 3 | ✅ |
| `expire-crummey-notices` | Auto-expire after 30 days | 3,4 | ✅ |
| `send-deadline-alerts` | Deadline notifications | 3 | ✅ |
| `record-premium-payment` | Log premium payments | 5 | ✅ |
| `analyze-policy-health` | AI health analysis (Gemini) | 6 | ✅ |
| `run-scheduled-health-checks` | Daily batch health checks | 6 | ✅ |
| `assign-action` | Assign remediation actions | 7 | ✅ |
| `complete-action` | Complete actions (single/bulk) | 7 | ✅ |
| `audit-trail-export` | Export audit logs | 8 | ✅ |
| `gift-tax-summary` | Gift tax reports | 8 | ✅ |
| `premium-payment-summary` | Payment reports | 8 | ✅ |
| `get-ilit-details` | Fetch ILIT by EIN | Support | ✅ |
| `process-document` | AI document extraction | Support | ✅ |
| `add-insurance-policy` | Create policies | Support | ✅ |
| `query-schema` | Schema introspection | Support | ✅ |

---

## Database Schema Cheat Sheet

### Key Relationships
```
trusts (trust_id)
  └─> ilits (ilit_id)
       ├─> gifts
       └─> insurance_policies (policy_id)
            ├─> premium_payments
            ├─> upcoming_premiums
            └─> policy_health_checks
                 └─> remediation_actions

trusts
  └─> beneficiaries
       └─> crummey_notices
```

### Common Foreign Keys
- `gifts.ilit_id` → `ilits.id`
- `ilits.trust_id` → `trusts.id`
- `insurance_policies.trust_id` → `trusts.id`
- `beneficiaries.trust_id` → `trusts.id`
- `crummey_notices.trust_id` → `trusts.id`
- `crummey_notices.beneficiary_id` → `beneficiaries.id`

### Important Columns
- `insurance_policies.carrier` (NOT carrier_name)
- `insurance_policies.next_premium_date` (NOT next_premium_due)
- `trusts.trust_name` (primary display name)
- `ilits.ein` (unique lookup key)

---

## Development Workflow

### Making Changes to Edge Functions

1. **Edit the function:**
   ```bash
   vi supabase/functions/{function-name}/index.ts
   ```

2. **Deploy to Supabase:**
   ```bash
   npx supabase functions deploy {function-name}
   ```

3. **Verify deployment:**
   - Check Supabase dashboard
   - Test via frontend or curl

4. **Commit changes:**
   ```bash
   git add -A
   git commit -m "Fix: description of change"
   git push
   ```

### Common Deploy Commands
```bash
# Deploy single function
npx supabase functions deploy analyze-policy-health

# Deploy multiple functions
npx supabase functions deploy func1 && npx supabase functions deploy func2
```

---

## Testing Checklist

### Before Deployment
- [ ] CORS headers include all three fields
- [ ] Column names match database schema
- [ ] Schema relationships follow foreign keys
- [ ] Null checks on all calculated/nullable fields
- [ ] Email addresses use verified Resend domain
- [ ] Routes exist in App.tsx before linking
- [ ] Edge function deployed successfully
- [ ] Frontend tested with real data

---

## Bug Patterns to Avoid

### ❌ Anti-Patterns
1. **Missing CORS Methods**
   ```typescript
   // Missing 'Access-Control-Allow-Methods'
   ```

2. **Wrong Column Names**
   ```typescript
   carrier_name, next_premium_due // Wrong
   ```

3. **Wrong Schema Paths**
   ```typescript
   gifts -> beneficiaries // No relationship exists
   ```

4. **No Null Checks**
   ```typescript
   value.toFixed(1) // Crashes if null
   ```

5. **Broken Routes**
   ```typescript
   navigate('/trusts') // Route doesn't exist
   ```

### ✅ Best Practices
1. **Complete CORS**
   ```typescript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
     'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
   };
   ```

2. **Verify Column Names**
   ```bash
   grep -r "CREATE TABLE" supabase/migrations/
   ```

3. **Follow Foreign Keys**
   ```typescript
   gifts.select('*, ilits!inner(*, trusts!inner(*))')
   ```

4. **Nullish Coalescing**
   ```typescript
   (value ?? 0).toFixed(1)
   ```

5. **Verify Routes**
   ```bash
   grep "Route path" src/App.tsx
   ```

---

## E2E Testing Notes (Jan 26, 2026)

### Bugs Found & Fixed
1. **CORS Headers** - 17 functions missing 'Access-Control-Allow-Methods'
2. **Email Address** - analyze-policy-health using unverified domain
3. **Column Name** - assign-action using carrier_name vs carrier
4. **Schema Path** - gift-tax-summary wrong relationship chain
5. **Navigation** - /trusts route didn't exist
6. **Null Safety** - AuditTrailExport crash on null success_rate

### Test Coverage
✅ All 8 PVD phases tested end-to-end
✅ Real-world trust/policy/gift scenarios
✅ All critical workflows verified
✅ No blocking issues found

---

## Quick Commands

### Git
```bash
# View recent commits
git log --oneline -10

# Stage, commit, push
git add -A && git commit -m "message" && git push
```

### Supabase
```bash
# Deploy function
npx supabase functions deploy {name}

# View logs
npx supabase functions logs {name}
```

### Search
```bash
# Find column name in migrations
grep -r "column_name" supabase/migrations/

# Find usage in code
grep -r "pattern" src/
```

---

## Contact & Resources

- **Supabase Project:** fnivqabphgbmkzpwowwg
- **Supabase Dashboard:** https://supabase.com/dashboard/project/fnivqabphgbmkzpwowwg
- **GitHub Repo:** https://github.com/csmif1/trustflow360
- **Documentation:** `/docs` folder

---

## Version History

**v1.0.0** (Jan 26, 2026)
- PVD V1 complete
- E2E testing complete
- Production ready
- All 18 edge functions deployed
- All 8 phases implemented

---

**Last Updated:** January 26, 2026
**Status:** Production Ready ✅
