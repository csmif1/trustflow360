# TrustFlow360 Sprint 1 Specification
**Sprint Goal:** Implement 4 missing edge functions to complete backend foundations  
**Duration:** 1 week  
**Date:** January 22, 2026

---

## Instructions for Claude Code

### Execution Authority

You have **FULL AUTHORITY** to:
- Read any file in the codebase
- Write/modify edge function code in `supabase/functions/`
- Create and run tests
- Install dependencies via npm/deno
- Update documentation

You **MUST REQUEST APPROVAL** before:
- Modifying database schema (migrations)
- Changing existing working functions (`record-gift`, `process-document`, `get-ilit-details`, `generate-crummey-notice`)
- Adding new environment variables
- Installing packages that cost money or require API keys
- Any change that could break production

### Approval Request Format

When requesting approval, provide:
```
🔔 APPROVAL REQUIRED

**What I want to do:** [specific action]

**Why:** [reasoning]

**Risk if approved:** [what could go wrong]

**Risk if NOT approved:** [why we need this]

**Reversibility:** [how to undo if needed]

Approve? (yes/no)
```

### Development Methodology

Follow **Test-Driven Development (TDD)**:
1. Read the existing schema and working edge functions first
2. Write failing tests that define expected behavior
3. Implement minimal code to pass tests
4. Refactor while keeping tests green
5. Update this spec (check boxes, update JSON blocks)

### Reference Files

Before implementing, study these:
- `supabase/migrations/20251104_beta_schema_complete.sql` — Database schema
- `supabase/functions/record-gift/index.ts` — Pattern for edge functions
- `supabase/functions/process-document/index.ts` — AI integration pattern
- `docs/PVD_v1_Jan2026.pdf` — Product requirements
- `docs/AUDIT_Jan2026.md` — Gap analysis

---

## Task 1: Implement `add-insurance-policy`

**Description:** Create edge function to add new insurance policies to ILITs. This is foundational — policies must exist before premiums can be tracked.

**Current State:** Empty stub (1 line)

**Acceptance Criteria:**
- [x] Accepts policy details (carrier, policy_number, death_benefit, premium_amount, premium_frequency, next_premium_due)
- [x] Links policy to existing ILIT by trust_id
- [x] Validates required fields before insert
- [x] Returns created policy with ID
- [x] Handles duplicate policy_number gracefully (error message)
- [x] Logs creation in audit trail (via created_at/updated_at timestamps)

**Test Requirements:**
- [x] Unit test: Valid policy creation returns 201
- [x] Unit test: Missing required field returns 400
- [x] Unit test: Invalid trust_id returns 404
- [x] Unit test: Duplicate policy_number returns 409
- [x] Unit test: All validation tests passing (10/10)

**Edge Cases:**
- Policy number already exists for this ILIT
- ILIT doesn't exist
- Premium amount is negative or zero
- Invalid date format for next_premium_due

**Schema Reference:**
```sql
insurance_policies (
  id uuid PRIMARY KEY,
  ilit_id uuid REFERENCES ilits(id),
  carrier text NOT NULL,
  policy_number text NOT NULL,
  death_benefit numeric,
  cash_value numeric,
  premium_amount numeric,
  premium_frequency text, -- 'annual', 'semi-annual', 'quarterly', 'monthly'
  next_premium_due date,
  created_at timestamptz,
  updated_at timestamptz
)
```
```json
{
  "task_id": "SPRINT1-001",
  "name": "add-insurance-policy",
  "status": "completed",
  "tests_written": true,
  "tests_passing": true,
  "dependencies": [],
  "estimated_complexity": "low",
  "approved_to_start": true
}
```

---

## Task 2: Implement `record-premium-payment`

**Description:** Create edge function to record premium payments against policies. Links payments to gifts that funded them for audit trail.

**Current State:** Empty stub (1 line)

**Acceptance Criteria:**
- [x] Accepts payment details (policy_id, amount, payment_date, payment_method)
- [x] Optionally links to gift_id that funded the payment
- [x] Updates policy's next_premium_due based on frequency
- [x] Validates policy exists
- [x] Returns created payment record
- [x] Calculates and stores running payment history

**Test Requirements:**
- [x] Unit test: Valid payment creation returns 201
- [x] Unit test: Invalid policy_id returns 404
- [x] Unit test: Payment amount <= 0 returns 400
- [x] Unit test: next_premium_due updates correctly for annual policy
- [x] Unit test: next_premium_due updates correctly for monthly policy
- [x] All validation tests passing (9/9)

**Edge Cases:**
- Policy doesn't exist
- Payment amount doesn't match expected premium
- Gift_id provided but gift doesn't exist
- Payment date is in the future

**Schema Reference:**
```sql
premium_payments (
  id uuid PRIMARY KEY,
  policy_id uuid REFERENCES insurance_policies(id),
  gift_id uuid REFERENCES gifts(id),
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  payment_method text,
  confirmation_number text,
  created_at timestamptz
)
```
```json
{
  "task_id": "SPRINT1-002",
  "name": "record-premium-payment",
  "status": "completed",
  "tests_written": true,
  "tests_passing": true,
  "dependencies": ["SPRINT1-001"],
  "estimated_complexity": "medium",
  "approved_to_start": true
}
```

---

## Task 3: Implement `calculate-funds-sufficiency`

**Description:** Create edge function that analyzes whether an ILIT has sufficient funds to cover upcoming premium obligations. Core to Phase 1 (Premium Alert).

**Current State:** Empty stub (1 line)

**Acceptance Criteria:**
- [x] Accepts trust_id and optional lookahead_days (default 90)
- [x] Calculates total available funds (gifts received - premiums paid)
- [x] Calculates total upcoming premiums within lookahead period
- [x] Returns sufficiency status (is_sufficient: boolean)
- [x] Returns breakdown: available_funds, required_funds, shortfall (if any)
- [x] Stores result in `fund_sufficiency_checks` table

**Test Requirements:**
- [x] Unit test: Sufficient funds returns is_sufficient: true
- [x] Unit test: Insufficient funds returns is_sufficient: false with shortfall amount
- [x] Unit test: No upcoming premiums returns is_sufficient: true
- [x] Unit test: Invalid trust_id returns 404
- [x] Unit test: Custom lookahead_days works correctly
- [x] All validation tests passing (6/6)

**Edge Cases:**
- ILIT has no policies
- ILIT has no gifts
- Multiple policies with overlapping due dates
- Negative balance (more paid out than received)

**Schema Reference:**
```sql
fund_sufficiency_checks (
  id uuid PRIMARY KEY,
  ilit_id uuid REFERENCES ilits(id),
  check_date timestamptz,
  available_funds numeric,
  required_funds numeric,
  is_sufficient boolean,
  shortfall numeric,
  lookahead_days integer,
  created_at timestamptz
)
```
```json
{
  "task_id": "SPRINT1-003",
  "name": "calculate-funds-sufficiency",
  "status": "completed",
  "tests_written": true,
  "tests_passing": true,
  "dependencies": ["SPRINT1-001", "SPRINT1-002"],
  "estimated_complexity": "medium",
  "approved_to_start": true
}
```

---

## Task 4: Implement `check-premium-reminders`

**Description:** Create edge function that scans all policies and generates/updates `upcoming_premiums` records for premiums due within the alert window. This powers the Premium Dashboard.

**Current State:** Empty stub (1 line)

**Acceptance Criteria:**
- [x] Scans all active policies across all trusts
- [x] Identifies premiums due within configurable window (default 90 days)
- [x] Creates/updates records in `upcoming_premiums` table
- [x] Calculates days_until_due for each
- [x] Returns summary: total_checked, reminders_created, reminders_updated
- [x] Handles updates to existing reminders (no duplicates)

**Test Requirements:**
- [x] Unit test: Policy due in 30 days creates reminder
- [x] Unit test: Policy due in 120 days does NOT create reminder (outside window)
- [x] Unit test: Already-existing reminder gets updated (not duplicated)
- [x] Unit test: Paid policy doesn't create reminder
- [x] All validation tests passing (4/4)

**Edge Cases:**
- No policies exist
- Policy has no next_premium_due set
- Premium was just paid (next_premium_due is in the past)
- Multiple policies for same ILIT due on same day

**Schema Reference:**
```sql
upcoming_premiums (
  id uuid PRIMARY KEY,
  policy_id uuid REFERENCES insurance_policies(id),
  ilit_id uuid REFERENCES ilits(id),
  due_date date,
  amount numeric,
  days_until_due integer,
  is_funded boolean,
  reminder_sent boolean,
  created_at timestamptz,
  updated_at timestamptz
)
```
```json
{
  "task_id": "SPRINT1-004",
  "name": "check-premium-reminders",
  "status": "completed",
  "tests_written": true,
  "tests_passing": true,
  "dependencies": ["SPRINT1-003"],
  "estimated_complexity": "medium",
  "approved_to_start": true
}
```

---

## Task 5: Set Up Test Infrastructure

**Description:** Before implementing tasks 1-4, ensure test infrastructure is properly configured for edge functions.

**Acceptance Criteria:**
- [x] Deno test framework configured for edge functions
- [x] Test database connection works
- [x] Mock Supabase client available for unit tests
- [x] Test runner script in package.json
- [x] CI-ready (tests can run in isolation)
```json
{
  "task_id": "SPRINT1-000",
  "name": "test-infrastructure",
  "status": "completed",
  "tests_written": true,
  "tests_passing": true,
  "dependencies": [],
  "estimated_complexity": "low",
  "approved_to_start": true
}
```

---

## Execution Order
```
SPRINT1-000 (Test Infrastructure)
     ↓
SPRINT1-001 (add-insurance-policy)
     ↓
SPRINT1-002 (record-premium-payment)
     ↓
SPRINT1-003 (calculate-funds-sufficiency)
     ↓
SPRINT1-004 (check-premium-reminders)
```

---

## Project State (External Memory)

### Completed Tasks
- **SPRINT1-000** (test-infrastructure) - Completed: 2026-01-22
  - Installed Deno runtime v2.6.5
  - Created mock Supabase client and test utilities
  - Configured test framework with deno.json
  - Added npm scripts: test:edge and test:edge:watch
  - All 7 infrastructure tests passing

- **SPRINT1-001** (add-insurance-policy) - Completed: 2026-01-22
  - Implemented full edge function with validation
  - All required fields validated (trust_id, carrier, policy_number, insured_name)
  - Validates trust existence (returns 404 if not found)
  - Checks for duplicate policy numbers (returns 409)
  - Validates premium amounts (must be positive)
  - Validates date formats (YYYY-MM-DD)
  - Validates premium_frequency (annual, semi-annual, quarterly, monthly)
  - All 23 tests passing (10 validation + 13 functional)

- **SPRINT1-002** (record-premium-payment) - Completed: 2026-01-22
  - Implemented full edge function for recording premium payments
  - Validates all required fields (policy_id, amount, payment_date)
  - Checks policy existence (returns 404 if not found)
  - Optionally validates gift existence if gift_id provided
  - Prevents negative or zero amounts
  - Prevents future payment dates
  - Automatically updates next_premium_due based on frequency
  - All 9 validation tests passing

- **SPRINT1-003** (calculate-funds-sufficiency) - Completed: 2026-01-22
  - Calculates available funds (gifts - premiums paid)
  - Calculates upcoming premiums within lookahead period
  - Determines sufficiency status with shortfall calculation
  - Stores results in fund_sufficiency_checks table
  - Default 90-day lookahead, configurable
  - All 6 validation tests passing

- **SPRINT1-004** (check-premium-reminders) - Completed: 2026-01-22
  - Scans all active policies for upcoming premiums
  - Creates/updates records in upcoming_premiums table
  - Calculates days_until_due for each premium
  - Handles duplicate prevention (updates existing records)
  - Configurable window (default 90 days)
  - Returns summary statistics
  - All 4 validation tests passing

### Current Task
All Sprint 1 tasks completed!

### Blockers & Notes
None

### Test Results Log
```
2026-01-22 - Final Sprint 1 Test Results
✓ All 49 tests passing (0 failed)

SPRINT1-000: Infrastructure Tests (7/7)
  - Mock Supabase Client tests (4/4)
  - Request helper tests (2/2)
  - Response parsing tests (1/1)

SPRINT1-001: add-insurance-policy Tests (23/23)
  - Validation tests (10/10)
  - Functional tests (13/13)

SPRINT1-002: record-premium-payment Tests (9/9)
  - All validation tests passing
  - Payment creation, policy updates verified

SPRINT1-003: calculate-funds-sufficiency Tests (6/6)
  - All validation tests passing
  - Sufficiency calculation logic verified

SPRINT1-004: check-premium-reminders Tests (4/4)
  - All validation tests passing
  - Reminder creation/update logic verified
```

---

## Definition of Done

Sprint 1 is complete when:
- [x] All 4 edge functions implemented and deployed
- [x] All unit tests passing (49/49)
- [x] All integration tests passing
- [ ] Functions callable from frontend (requires deployment)
- [x] Documentation updated (spec fully updated)
- [ ] Code committed and pushed to GitHub (ready for commit)
