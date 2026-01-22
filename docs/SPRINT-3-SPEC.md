# TrustFlow360 Sprint 3 Specification
**Sprint Goal:** AI-Powered Policy Health Monitoring & Remediation
**Duration:** 2 weeks
**Date:** January 2026

---

## Instructions for Claude Code

### Execution Authority

You have **FULL AUTHORITY** to:
- Read any file in the codebase
- Create new edge functions in `supabase/functions/`
- Create new React components in `src/components/`
- Write and run tests
- Update email templates
- Create new database migrations (with approval - see below)

You **MUST REQUEST APPROVAL** before:
- Modifying existing database tables (schema changes)
- Creating new database tables (migrations)
- Adding new environment variables requiring external API keys
- Making changes that could send emails/alerts to real users
- Deploying changes that affect existing policies in production

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

### Reference Files

Before implementing, study these:
- `supabase/functions/process-document/index.ts` — Gemini AI integration pattern
- `supabase/functions/check-premium-reminders/index.ts` — Premium monitoring logic
- `supabase/migrations/20251104_beta_schema_complete.sql` — Current schema
- `src/components/ILITManagement.tsx` — UI patterns
- `docs/SPRINT-1-SPEC.md` and `docs/SPRINT-2-SPEC.md` — Previous sprint patterns

---

## Task 1: Create Policy Health Check Database Schema

**Description:** Design and implement database tables to store policy health analysis results, AI recommendations, and remediation tracking.

**Current State:** No policy health tracking infrastructure exists

**Acceptance Criteria:**
- [ ] Create migration for `policy_health_checks` table
- [ ] Create migration for `remediation_actions` table
- [ ] Create migration for `health_check_templates` table
- [ ] Add proper indexes for query performance
- [ ] Add RLS policies for data security
- [ ] Document schema in comments

**Schema Design:**

```sql
-- Policy Health Checks
CREATE TABLE IF NOT EXISTS policy_health_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID REFERENCES insurance_policies(id) ON DELETE CASCADE,
  ilit_id UUID REFERENCES ilits(id) ON DELETE CASCADE,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Overall Health Status
  overall_status TEXT NOT NULL CHECK (overall_status IN ('healthy', 'warning', 'critical', 'unknown')),
  health_score NUMERIC(5,2) CHECK (health_score >= 0 AND health_score <= 100),

  -- Component Health Metrics
  premium_payment_status TEXT CHECK (premium_payment_status IN ('current', 'late', 'delinquent', 'unknown')),
  days_until_next_premium INTEGER,
  coverage_adequacy_score NUMERIC(5,2),
  beneficiary_designation_status TEXT CHECK (beneficiary_designation_status IN ('valid', 'needs_review', 'invalid', 'unknown')),
  ownership_verification_status TEXT CHECK (ownership_verification_status IN ('verified', 'needs_verification', 'failed', 'unknown')),

  -- AI Analysis Results
  ai_analysis_summary TEXT,
  ai_model_version TEXT,
  ai_confidence_score NUMERIC(5,4) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
  issues_detected JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,

  -- Remediation Status
  remediation_required BOOLEAN DEFAULT false,
  remediation_priority TEXT CHECK (remediation_priority IN ('low', 'medium', 'high', 'urgent')),
  remediation_deadline DATE,
  remediation_status TEXT CHECK (remediation_status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  -- Metadata
  checked_by UUID REFERENCES auth.users(id),
  check_trigger TEXT, -- 'manual', 'scheduled', 'alert', 'api'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Remediation Actions
CREATE TABLE IF NOT EXISTS remediation_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  health_check_id UUID REFERENCES policy_health_checks(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES insurance_policies(id) ON DELETE CASCADE,

  -- Action Details
  action_type TEXT NOT NULL, -- 'contact_trustee', 'update_beneficiary', 'pay_premium', 'verify_ownership', 'custom'
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  description TEXT,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,

  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'blocked')),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  completion_notes TEXT,

  -- AI Recommendations
  ai_suggested BOOLEAN DEFAULT false,
  ai_recommendation_text TEXT,

  -- Alert Configuration
  email_alert_sent BOOLEAN DEFAULT false,
  email_alert_sent_at TIMESTAMP WITH TIME ZONE,
  sms_alert_sent BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health Check Templates (for customizable checks)
CREATE TABLE IF NOT EXISTS health_check_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  -- Check Configuration
  check_criteria JSONB NOT NULL, -- Rules for what to check
  scoring_weights JSONB, -- Weights for different factors

  -- Thresholds
  critical_threshold NUMERIC(5,2) DEFAULT 50,
  warning_threshold NUMERIC(5,2) DEFAULT 75,

  -- Usage
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_health_checks_policy ON policy_health_checks(policy_id);
CREATE INDEX idx_health_checks_date ON policy_health_checks(check_date DESC);
CREATE INDEX idx_health_checks_status ON policy_health_checks(overall_status);
CREATE INDEX idx_remediation_policy ON remediation_actions(policy_id);
CREATE INDEX idx_remediation_status ON remediation_actions(status);
CREATE INDEX idx_remediation_assigned ON remediation_actions(assigned_to);

-- RLS Policies
ALTER TABLE policy_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_templates ENABLE ROW LEVEL SECURITY;
```

**Test Requirements:**
- [ ] Migration runs successfully on clean database
- [ ] All constraints enforce data integrity
- [ ] Indexes improve query performance (benchmark)
- [ ] RLS policies prevent unauthorized access

```json
{
  "task_id": "SPRINT3-001",
  "name": "policy-health-schema",
  "status": "pending",
  "tests_written": false,
  "tests_passing": false,
  "dependencies": [],
  "estimated_complexity": "medium",
  "approved_to_start": false
}
```

---

## Task 2: Build AI Health Analysis Edge Function

**Description:** Create edge function that uses Gemini AI to analyze policy health by examining policy data, premium history, and beneficiary information.

**Current State:** No automated policy health analysis exists

**Acceptance Criteria:**
- [ ] Edge function accepts policy_id and returns health analysis
- [ ] Integrates with Gemini API for intelligent analysis
- [ ] Calculates health score (0-100) based on multiple factors
- [ ] Detects common issues (delinquent premiums, coverage gaps, etc.)
- [ ] Generates actionable AI recommendations
- [ ] Stores results in `policy_health_checks` table
- [ ] Returns structured JSON response

**Health Check Factors:**
1. **Premium Payment Status** (30% weight)
   - Current vs. delinquent
   - Payment history consistency
   - Days overdue

2. **Coverage Adequacy** (25% weight)
   - Death benefit vs. trust needs
   - Premium sustainability
   - Fund sufficiency

3. **Beneficiary Designation** (20% weight)
   - Valid beneficiaries
   - Crummey notice compliance
   - Current contact information

4. **Ownership Verification** (15% weight)
   - Trust owns policy
   - Proper assignment
   - Title verification

5. **Documentation** (10% weight)
   - Policy document on file
   - Recent updates
   - Completeness

**Implementation:**

```typescript
interface HealthCheckInput {
  policy_id: string;
  force_recheck?: boolean;
  check_trigger?: 'manual' | 'scheduled' | 'alert' | 'api';
}

interface HealthCheckResult {
  success: boolean;
  health_check_id: string;
  policy_id: string;
  overall_status: 'healthy' | 'warning' | 'critical' | 'unknown';
  health_score: number; // 0-100
  component_scores: {
    premium_payment: number;
    coverage_adequacy: number;
    beneficiary_designation: number;
    ownership_verification: number;
    documentation: number;
  };
  issues: Issue[];
  recommendations: Recommendation[];
  ai_confidence: number;
}

interface Issue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected_at: string;
  requires_remediation: boolean;
}

interface Recommendation {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  due_date?: string;
  ai_generated: boolean;
}
```

**AI Prompt Template:**
```
Analyze the following insurance policy health data and provide recommendations:

Policy Details:
- Policy ID: {policy_id}
- Face Value: {face_value}
- Annual Premium: {annual_premium}
- Policy Type: {policy_type}

Premium Payment History:
{premium_history}

Beneficiary Information:
{beneficiary_info}

Coverage Analysis:
- Trust Assets: {trust_assets}
- Premium Coverage Ratio: {coverage_ratio}

Please analyze:
1. Premium payment health (current, late, or delinquent)
2. Coverage adequacy for trust needs
3. Beneficiary designation accuracy
4. Any compliance issues
5. Urgent action items

Return your analysis as structured JSON with:
- overall_status (healthy/warning/critical)
- health_score (0-100)
- issues array with severity levels
- recommendations array with priorities
```

**Test Requirements:**
- [ ] Unit test: Valid policy returns health analysis
- [ ] Unit test: Missing policy returns 404
- [ ] Unit test: Policy with delinquent premium returns critical status
- [ ] Unit test: Policy with adequate coverage returns healthy status
- [ ] Unit test: AI analysis includes actionable recommendations
- [ ] Integration test: Health check stores in database
- [ ] Integration test: Multiple checks for same policy track history

**Edge Cases:**
- Policy with no premium payment history
- Policy missing beneficiary information
- AI API timeout or failure (graceful degradation)
- Concurrent health checks on same policy
- Policy deleted after health check started

```json
{
  "task_id": "SPRINT3-002",
  "name": "analyze-policy-health",
  "status": "pending",
  "tests_written": false,
  "tests_passing": false,
  "dependencies": ["SPRINT3-001"],
  "estimated_complexity": "high",
  "approved_to_start": true
}
```

---

## Task 3: Create Remediation Action Edge Function

**Description:** Automatically create and assign remediation tasks when critical health issues are detected.

**Acceptance Criteria:**
- [ ] Creates remediation action from health check results
- [ ] Assigns to appropriate user (trustee, attorney)
- [ ] Sets priority and deadline based on severity
- [ ] Sends email/SMS alerts for urgent issues
- [ ] Tracks remediation status
- [ ] Supports manual remediation creation
- [ ] Updates when actions completed

**Remediation Action Types:**
- `contact_trustee` - Premium payment or policy issue
- `update_beneficiary` - Beneficiary designation problem
- `pay_premium` - Delinquent premium payment
- `verify_ownership` - Trust ownership verification needed
- `update_coverage` - Coverage inadequate
- `review_document` - Policy documentation missing/incomplete
- `custom` - User-defined action

**Implementation:**

```typescript
interface RemediationInput {
  health_check_id: string;
  action_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  due_date?: string;
  send_alerts?: boolean;
}

interface RemediationResult {
  success: boolean;
  action_id: string;
  assigned_to: string;
  due_date: string;
  alerts_sent: {
    email: boolean;
    sms: boolean;
  };
}
```

**Alert Templates:**
- Urgent premium payment required (< 7 days)
- Coverage inadequacy detected
- Beneficiary information needs update
- Document verification needed

**Test Requirements:**
- [ ] Unit test: Creates remediation action for critical issue
- [ ] Unit test: Assigns to correct user based on issue type
- [ ] Unit test: Sets appropriate deadline for urgent issues
- [ ] Unit test: Sends email alert for high priority
- [ ] Unit test: Skips alerts when send_alerts=false
- [ ] Integration test: Links to health check correctly

```json
{
  "task_id": "SPRINT3-003",
  "name": "create-remediation-action",
  "status": "pending",
  "tests_written": false,
  "tests_passing": false,
  "dependencies": ["SPRINT3-001", "SPRINT3-002"],
  "estimated_complexity": "medium",
  "approved_to_start": true
}
```

---

## Task 4: Build Policy Health Dashboard UI

**Description:** Create React component to display policy health status, issues, and recommendations with actionable remediation workflow.

**Current State:** No health monitoring UI exists

**Acceptance Criteria:**
- [ ] Dashboard displays all policies with health status indicators
- [ ] Color-coded health scores (green/yellow/red)
- [ ] List view shows critical issues at top
- [ ] Detail view shows AI analysis and recommendations
- [ ] Manual "Run Health Check" button
- [ ] Historical health trend chart
- [ ] Remediation action management
- [ ] Filter by health status, priority, policy type
- [ ] Export health report to PDF

**Component Structure:**

```typescript
// PolicyHealthDashboard.tsx
interface PolicyHealthDashboardProps {
  policies: Policy[];
  onRunHealthCheck: (policyId: string) => void;
  onCreateRemediation: (checkId: string) => void;
}

// PolicyHealthCard.tsx
interface PolicyHealthCardProps {
  policy: Policy;
  healthCheck: PolicyHealthCheck;
  onViewDetails: () => void;
  onRunCheck: () => void;
}

// HealthCheckDetails.tsx
interface HealthCheckDetailsProps {
  healthCheck: PolicyHealthCheck;
  issues: Issue[];
  recommendations: Recommendation[];
  onCreateAction: (recommendation: Recommendation) => void;
}

// RemediationActionList.tsx
interface RemediationActionListProps {
  actions: RemediationAction[];
  onUpdateStatus: (actionId: string, status: string) => void;
  onCompleteAction: (actionId: string, notes: string) => void;
}
```

**UI Features:**
1. **Overview Dashboard**
   - Summary cards: Total policies, healthy, warnings, critical
   - Urgent actions count
   - Next scheduled health checks

2. **Policy List**
   - Health status badge
   - Last check date
   - Issues count
   - Quick actions menu

3. **Health Details Modal**
   - Overall health score gauge
   - Component scores breakdown
   - Issue list with severity badges
   - AI recommendations
   - Historical trend chart
   - "Create Remediation" button

4. **Remediation Panel**
   - Pending actions list
   - Overdue actions highlight
   - Assignment management
   - Status updates
   - Completion workflow

**Test Requirements:**
- [ ] Component renders with sample data
- [ ] Health status colors match thresholds
- [ ] "Run Health Check" triggers API call
- [ ] Remediation creation opens modal
- [ ] Filters work correctly
- [ ] Historical data displays in chart
- [ ] Responsive on mobile devices

```json
{
  "task_id": "SPRINT3-004",
  "name": "policy-health-ui",
  "status": "pending",
  "tests_written": false,
  "tests_passing": false,
  "dependencies": ["SPRINT3-002"],
  "estimated_complexity": "high",
  "approved_to_start": true
}
```

---

## Task 5: Schedule Automated Health Checks

**Description:** Set up cron job to automatically run policy health checks on a schedule and trigger alerts for critical issues.

**Acceptance Criteria:**
- [ ] Daily health checks run at 2 AM UTC
- [ ] Prioritizes policies with upcoming premiums (< 30 days)
- [ ] Checks policies with no recent analysis (> 90 days)
- [ ] Sends daily summary email to admin
- [ ] Creates remediation actions for critical issues
- [ ] Logs all automated checks
- [ ] Handles API failures gracefully

**Cron Configuration:**

```sql
-- Daily Policy Health Checks (2 AM UTC)
SELECT cron.schedule(
  'daily-policy-health-checks',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url')
           || '/functions/v1/run-scheduled-health-checks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('trigger', 'scheduled')
  )
  $$
);

-- Weekly Health Summary Report (Monday 9 AM UTC)
SELECT cron.schedule(
  'weekly-health-summary',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url')
           || '/functions/v1/send-health-summary-report',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
      'Content-Type', 'application/json'
    )
  )
  $$
);
```

**Edge Function: `run-scheduled-health-checks`**

```typescript
interface ScheduledCheckResult {
  success: boolean;
  total_policies: number;
  checks_run: number;
  critical_issues_found: number;
  remediations_created: number;
  execution_time_ms: number;
  timestamp: string;
}
```

**Priority Logic:**
1. Policies with premiums due in < 7 days (urgent)
2. Policies with premiums due in 7-30 days (high)
3. Policies not checked in > 90 days (medium)
4. All other active policies (low)

**Test Requirements:**
- [ ] Cron job executes successfully
- [ ] High priority policies checked first
- [ ] Summary email sent to admin
- [ ] Critical issues create remediation actions
- [ ] Failed checks logged for retry
- [ ] Performance acceptable for large portfolios (>100 policies)

```json
{
  "task_id": "SPRINT3-005",
  "name": "scheduled-health-checks",
  "status": "pending",
  "tests_written": false,
  "tests_passing": false,
  "dependencies": ["SPRINT3-002", "SPRINT3-003"],
  "estimated_complexity": "medium",
  "approved_to_start": false
}
```

---

## Execution Order

```
SPRINT3-001 (Schema) ────────┐
                             │
                             ├──► SPRINT3-002 (AI Health Analysis)
                             │           │
                             │           ├──► SPRINT3-003 (Remediation Actions)
                             │           │           │
                             │           │           └──► SPRINT3-005 (Scheduled Checks)
                             │           │
                             │           └──► SPRINT3-004 (Health Dashboard UI)
```

**Recommended Order:**
1. SPRINT3-001: Create database schema (requires approval)
2. SPRINT3-002: Build AI health analysis function
3. SPRINT3-003: Create remediation action function
4. SPRINT3-004: Build UI dashboard (can run parallel with 3)
5. SPRINT3-005: Set up cron jobs (requires approval)

---

## Project State (External Memory)

### Completed Tasks
_Track task completion here as Sprint 3 progresses_

### Current Task
_Update with current focus_

### Blockers & Notes
- Requires Gemini API key in production (already configured from Sprint 1)
- Email service configured from Sprint 2 ✓
- Need sample policy data for AI training/testing
- Consider rate limiting for AI API calls (cost control)

### Test Results Log
_Track test runs here_

---

## Definition of Done

Sprint 3 is complete when:
- [ ] Database schema created and migrated
- [ ] `analyze-policy-health` edge function deployed and tested
- [ ] `create-remediation-action` edge function deployed and tested
- [ ] `run-scheduled-health-checks` edge function deployed and tested
- [ ] Policy Health Dashboard UI implemented and functional
- [ ] Automated health checks running on schedule
- [ ] All unit tests passing (target: 25+ tests)
- [ ] Integration tests confirm end-to-end workflow
- [ ] AI health analysis produces accurate results (>80% confidence)
- [ ] Remediation actions sent and tracked successfully
- [ ] Documentation updated with health check API
- [ ] Code committed and pushed to GitHub

---

## Success Metrics

**Technical:**
- Health check execution time < 5 seconds per policy
- AI confidence score > 0.80 on average
- Zero false critical alerts
- 99% cron job success rate

**Business:**
- Detect 100% of delinquent premiums within 24 hours
- Identify coverage gaps before they become critical
- Reduce manual policy review time by 70%
- Generate actionable remediation tasks automatically

---

## Notes

**AI Training Considerations:**
- Start with rule-based health checks, enhance with AI over time
- Use AI primarily for pattern recognition and recommendations
- Keep critical business logic deterministic (premiums, dates)
- Log AI responses for continuous improvement

**Future Enhancements (Sprint 4+):**
- Machine learning model for premium payment prediction
- Integration with insurance carrier APIs for real-time data
- Mobile app for remediation action management
- Predictive analytics for policy lapse risk
