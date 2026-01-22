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
- [ ] Accepts policy details (carrier, policy_number, death_benefit, premium_amount, premium_frequency, next_premium_due)
- [ ] Links policy to existing ILIT by ilit_id
- [ ] Validates required fields before insert
- [ ] Returns created policy with ID
- [ ] Handles duplicate policy_number gracefully (error message)
- [ ] Logs creation in audit trail

**Test Requirements:**
- [ ] Unit test: Valid policy creation returns 201
- [ ] Unit test: Missing required field returns 400
- [ ] Unit test: Invalid ilit_id returns 404
- [ ] Unit test: Duplicate policy_number returns 409
- [ ] Integration test: Policy appears in `insurance_policies` table

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
  "status": "pending",
  "tests_written": false,
  "tests_passing": false,
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
- [ ] Accepts payment details (policy_id, amount, payment_date, payment_method)
- [ ] Optionally links to gift_id that funded the payment
- [ ] Updates policy's next_premium_due based on frequency
- [ ] Validates policy exists
- [ ] Returns created payment record
- [ ] Calculates and stores running payment history

**Test Requirements:**
- [ ] Unit test: Valid payment creation returns 201
- [ ] Unit test: Invalid policy_id returns 404
- [ ] Unit test: Payment amount <= 0 returns 400
- [ ] Unit test: next_premium_due updates correctly for annual policy
- [ ] Unit test: next_premium_due updates correctly for monthly policy
- [ ] Integration test: Payment appears in `premium_payments` table
- [ ] Integration test: Policy's next_premium_due is updated

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
  "status": "pending",
  "tests_written": false,
  "tests_passing": false,
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
- [ ] Accepts ilit_id and optional lookahead_days (default 90)
- [ ] Calculates total available funds (gifts received - premiums paid - withdrawals)
- [ ] Calculates total upcoming premiums within lookahead period
- [ ] Returns sufficiency status (is_sufficient: boolean)
- [ ] Returns breakdown: available_funds, required_funds, shortfall (if any)
- [ ] Stores result in `fund_sufficiency_checks` table

**Test Requirements:**
- [ ] Unit test: Sufficient funds returns is_sufficient: true
- [ ] Unit test: Insufficient funds returns is_sufficient: false with shortfall amount
- [ ] Unit test: No upcoming premiums returns is_sufficient: true
- [ ] Unit test: Invalid ilit_id returns 404
- [ ] Unit test: Custom lookahead_days works correctly
- [ ] Integration test: Result stored in `fund_sufficiency_checks`

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
  "status": "pending",
  "tests_written": false,
  "tests_passing": false,
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
- [ ] Scans all active policies across all ILITs
- [ ] Identifies premiums due within configurable window (default 90 days)
- [ ] Creates/updates records in `upcoming_premiums` table
- [ ] Calculates days_until_due for each
- [ ] Flags policies where ILIT funds are insufficient
- [ ] Returns summary: total_checked, reminders_created, reminders_updated

**Test Requirements:**
- [ ] Unit test: Policy due in 30 days creates reminder
- [ ] Unit test: Policy due in 120 days does NOT create reminder (outside window)
- [ ] Unit test: Already-existing reminder gets updated (not duplicated)
- [ ] Unit test: Paid policy doesn't create reminder
- [ ] Integration test: Records appear in `upcoming_premiums`
- [ ] Integration test: Calls `calculate-funds-sufficiency` for flagging

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
  "status": "pending",
  "tests_written": false,
  "tests_passing": false,
  "dependencies": ["SPRINT1-003"],
  "estimated_complexity": "medium",
  "approved_to_start": true
}
```

---

## Task 5: Set Up Test Infrastructure

**Description:** Before implementing tasks 1-4, ensure test infrastructure is properly configured for edge functions.

**Acceptance Criteria:**
- [ ] Deno test framework configured for edge functions
- [ ] Test database connection works
- [ ] Mock Supabase client available for unit tests
- [ ] Test runner script in package.json
- [ ] CI-ready (tests can run in isolation)
```json
{
  "task_id": "SPRINT1-000",
  "name": "test-infrastructure",
  "status": "pending",
  "tests_written": false,
  "tests_passing": false,
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
<!-- Claude Code: Add completed task IDs here with timestamps -->

### Current Task
<!-- Claude Code: Update with current task ID -->

### Blockers & Notes
<!-- Claude Code: Document any blockers or important discoveries -->

### Test Results Log
<!-- Claude Code: Log test run results with timestamps -->

---

## Definition of Done

Sprint 1 is complete when:
- [ ] All 4 edge functions implemented and deployed
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Functions callable from frontend
- [ ] Documentation updated
- [ ] Code committed and pushed to GitHub
