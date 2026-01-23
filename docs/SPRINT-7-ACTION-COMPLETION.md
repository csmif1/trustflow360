# SPRINT 7: Action Completion Workflow

## Context
- **Current State:** 84% PVD V1 completion (post-Sprint 6)
- **Target Phase:** Phase 7 - Remediation Workflow (currently 75%)
- **Goal:** Add completion workflow to remediation actions
- **Effort Estimate:** Medium (3-5 days, core in ~2-3 hours)

## Business Value
When remediation actions are assigned and worked, there's currently no way to mark them complete with documentation. For audit trail integrity and workflow management, completion tracking is critical for:

- **Audit Trail** — Document what was done and when
- **Accountability** — Record who completed each action
- **Compliance** — Prove remediation occurred for fiduciary protection
- **Workflow** — Clear pending vs completed states
- **Reporting** — Track resolution rates and timelines

---

## Objective
Add the ability to mark remediation actions as complete with required notes, supporting both single and bulk completion.

---

## Technical Requirements

### 1. Database Migration

Add completion tracking fields to `remediation_actions` table:

```sql
-- Add completion fields to remediation_actions
ALTER TABLE remediation_actions 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Index for filtering/sorting by completion
CREATE INDEX IF NOT EXISTS idx_remediation_actions_completed_at 
ON remediation_actions(completed_at);
```

### 2. Edge Function

Create `supabase/functions/complete-action/index.ts`:

**Endpoint:** `POST /complete-action`

**Request (single):**
```json
{
  "action_id": "uuid",
  "notes": "Premium payment confirmed via check #1234. Deposited 1/23/26."
}
```

**Request (bulk):**
```json
{
  "action_ids": ["uuid1", "uuid2", "uuid3"],
  "notes": "Batch completion - all Crummey notices sent via certified mail."
}
```

**Logic:**
1. Validate action(s) exist and user has access (RLS)
2. Validate notes provided (required, max 500 chars)
3. Update remediation_action(s):
   - `status` = 'completed'
   - `completed_at` = now()
   - `completed_by` = auth.uid()
   - `completion_notes` = notes
4. Return updated action(s)

**Response (single):**
```json
{
  "success": true,
  "action": {
    "id": "uuid",
    "status": "completed",
    "completed_at": "2026-01-23T18:00:00Z",
    "completed_by": "user-uuid",
    "completion_notes": "Premium payment confirmed..."
  }
}
```

**Response (bulk):**
```json
{
  "success": true,
  "completed_count": 3,
  "actions": [...]
}
```

### 3. Frontend Updates

**A. Completion UI in PolicyHealth.tsx:**

Add to each pending action row:
- "Mark Complete" button (next to existing Assign button)
- Button disabled/hidden for already-completed actions

**B. Completion Dialog:**
- Action summary header (type, trust name, due date)
- Notes textarea (required, max 500 chars)
- Character count indicator
- Placeholder: "Describe how this was resolved..."
- "Complete" button (disabled until notes entered)
- "Cancel" button

**C. Bulk Completion:**
- Checkbox on each pending action row
- Select all checkbox in table header (pending only)
- "Complete Selected (N)" button when any selected
- Same dialog, shows "Completing N actions"

**D. Visual States:**

| State | Styling |
|-------|---------|
| Pending | Normal styling, action buttons visible |
| Completed | Muted/gray background, checkmark icon, shows completed_at date |

**E. Feedback:**
- Toast on success: "Action completed" / "N actions completed"
- Toast on error: "Failed to complete action: [error]"
- Refresh action list after completion

### 4. Integration Points

- Works with existing `remediation_actions` table from Sprint 3
- Extends assignment workflow from Sprint 6
- Fits into Compliance tab → Policy Health sub-section
- Completes the action lifecycle: Created → Assigned → Completed

---

## Design Guidelines

Follow existing Mercury/Clio design system:
- Dialog matches existing assignment dialog pattern
- Completed actions use muted styling (opacity or gray background)
- Checkmark icon for completed status
- Consistent with existing action card styling

---

## Acceptance Criteria

- [ ] Completion fields added to remediation_actions table
- [ ] Can complete single action with required notes
- [ ] Can bulk complete multiple actions at once
- [ ] `completed_at` timestamp auto-recorded
- [ ] `completed_by` captures current user UUID
- [ ] Notes required (cannot complete without notes)
- [ ] Completed vs pending actions visually distinct
- [ ] Cannot complete an already-completed action
- [ ] V1-PROGRESS.md updated: Phase 7 → 100%

---

## Reference Files

**Patterns to follow:**
- `src/components/PolicyHealth.tsx` - Where actions are displayed
- `supabase/functions/assign-action/index.ts` - Recent edge function pattern
- `docs/SPRINT-6-ACTION-ASSIGNMENT.md` - Previous sprint pattern

**Schema reference:**
- `docs/SCHEMA-REFERENCE.md` - Existing database schema
- `supabase/migrations/` - Migration patterns

---

## Execution Order

1. **Database first** - Add completion columns to remediation_actions
2. **Edge function** - Create complete-action endpoint (single + bulk)
3. **Frontend** - Add completion UI (button, dialog, bulk select)
4. **Testing** - Complete single action, bulk complete 3+, verify states
5. **Documentation** - Update V1-PROGRESS.md

---

## Success Metrics

After Sprint 7:
- Phase 7 (Remediation Workflow): 75% → **100%** ✅
- Overall PVD V1: 84% → **~87%**
- Remaining gaps: 2 → **1** (only Gift Tax Summary Report remains)
