# SPRINT 6: Action Assignment

## Context
- **Current State:** 82% PVD V1 completion (post-Sprint 5)
- **Target Phase:** Phase 7 - Remediation Workflow (currently 60%)
- **Goal:** Add assignment capability to remediation actions
- **Effort Estimate:** Small (2-3 days, core in ~1 hour)

## Business Value
When policy health checks identify issues, remediation actions are created. Currently there's no way to assign these actions to specific team members. For firms with multiple staff (paralegals, junior attorneys, admins), assignment is critical for:

- **Accountability** — Know who owns each task
- **Workflow** — Distribute work across team
- **Tracking** — See workload by person
- **Notifications** — Alert assignee via email

---

## Objective
Add the ability to assign remediation actions to team members with email notifications.

---

## Technical Requirements

### 1. Database Migration

Add `assigned_to` and related fields to `remediation_actions` table:

```sql
-- Add assignment fields to remediation_actions
ALTER TABLE remediation_actions 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_to_email TEXT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

-- Index for filtering by assignee
CREATE INDEX IF NOT EXISTS idx_remediation_actions_assigned_to 
ON remediation_actions(assigned_to);
```

### 2. Edge Function Enhancement

Update or create `supabase/functions/assign-action/index.ts`:

**Endpoint:** `POST /assign-action`

**Request:**
```json
{
  "action_id": "uuid",
  "assigned_to_email": "paralegal@firm.com",
  "assigned_to_name": "Jane Smith"
}
```

**Logic:**
1. Update remediation_action with assignment fields
2. Send email notification via Resend
3. Return updated action

**Email Template:**
- Subject: "TrustFlow360: Action Assigned - [Action Title]"
- Body: Action details, policy info, due date, link to dashboard

### 3. Frontend Updates

**A. Assignment UI in PolicyHealth.tsx or dedicated component:**

Add to each action row:
- "Assign" button or dropdown
- Shows current assignee (if any)
- Simple modal or inline select for assignment

**B. Assignment Modal/Dropdown:**
- Email input (with autocomplete if team members exist)
- Name input
- "Assign & Notify" button

**C. Filter by Assignee:**
- Add "Assigned To" filter to remediation actions view
- "My Actions" quick filter

### 4. Integration Points

- Works with existing `remediation_actions` table from Sprint 3
- Uses Resend email pattern from existing edge functions
- Fits into Compliance tab → Policy Health sub-section

---

## Design Guidelines

Follow existing Mercury/Clio design system:
- Simple dropdown or modal for assignment
- Badge showing assignee name on action cards
- Consistent with existing action card styling

---

## Acceptance Criteria

- [ ] `assigned_to` fields added to remediation_actions table
- [ ] Can assign an action to someone by email/name
- [ ] Email notification sent on assignment via Resend
- [ ] Assignee visible on action card/row
- [ ] Can filter actions by assignee
- [ ] Can see "My Actions" (assigned to current user)
- [ ] V1-PROGRESS.md updated: Phase 7 increased

---

## Reference Files

**Patterns to follow:**
- `src/components/PolicyHealth.tsx` - Where actions are displayed
- `supabase/functions/send-alert-email/index.ts` - Resend pattern
- `supabase/functions/gift-request-generator/index.ts` - Recent edge function pattern

**Schema reference:**
- `docs/SCHEMA-REFERENCE.md` - Existing database schema
- `supabase/migrations/` - Migration patterns

---

## Execution Order

1. **Database first** - Add assignment columns to remediation_actions
2. **Edge function** - Create assign-action endpoint with email
3. **Frontend** - Add assignment UI to action cards
4. **Testing** - Assign an action, verify email sent
5. **Documentation** - Update V1-PROGRESS.md

---

## Success Metrics

After Sprint 6:
- Phase 7 (Remediation Workflow): 60% → **75%**
- Overall PVD V1: 82% → **~84%**
- Remaining gaps: 3 → **2**
