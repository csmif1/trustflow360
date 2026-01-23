# SPRINT 5: Gift Request Generator

## Context
- **Current State:** 78% PVD V1 completion (post-Sprint 4)
- **Target Phase:** Phase 2 - Gift Coordination (currently 70%)
- **Goal:** Complete Phase 2 by building the Gift Request Generator
- **Effort Estimate:** Medium (3-5 days)

## Business Value
Professional trustees need to proactively request contributions from grantors before premium due dates. Currently this is manual — phone calls, custom letters, spreadsheet tracking. This feature automates the entire workflow:

**Request → Track → Receive → Crummey Notice → Withdrawal Tracking**

For Seth managing 800 trusts, this is high-ROI automation.

---

## Objective
Build a Gift Request Generator that allows trustees to:
1. Generate contribution request letters to grantors
2. Send via email or download for mailing
3. Track request status through receipt of funds

---

## Technical Requirements

### 1. Database Schema

Check if `gift_requests` table exists. If not, create:

```sql
CREATE TABLE gift_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID REFERENCES trusts(id) NOT NULL,
  policy_id UUID REFERENCES policies(id) NOT NULL,
  grantor_name TEXT NOT NULL,
  grantor_email TEXT,
  amount_requested DECIMAL(12,2) NOT NULL,
  premium_due_date DATE,
  request_due_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'reminded', 'received', 'expired')),
  sent_at TIMESTAMPTZ,
  sent_via TEXT CHECK (sent_via IN ('email', 'mail', 'both')),
  reminder_sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  received_amount DECIMAL(12,2),
  notes TEXT,
  letter_html TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_gift_requests_trust ON gift_requests(trust_id);
CREATE INDEX idx_gift_requests_policy ON gift_requests(policy_id);
CREATE INDEX idx_gift_requests_status ON gift_requests(status);
CREATE INDEX idx_gift_requests_due_date ON gift_requests(request_due_date);

-- RLS
ALTER TABLE gift_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gift requests" ON gift_requests
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own gift requests" ON gift_requests
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own gift requests" ON gift_requests
  FOR UPDATE USING (auth.uid() = created_by);
```

### 2. Backend - Edge Function

Create `supabase/functions/gift-request-generator/index.ts`:

**Endpoints:**
- `POST /generate` - Generate gift request letter (returns HTML)
- `POST /send` - Send via Resend email
- `GET /calculate` - Calculate recommended gift amount

**Gift Amount Calculation Logic:**
```
Premium Amount ÷ Number of Grantors = Base Request

Check against annual exclusion limits:
- 2024: $18,000 per donor per beneficiary
- 2025: $19,000 per donor per beneficiary
- 2026: $19,000 (assumed)

If Base Request > (Annual Exclusion × Number of Beneficiaries):
  Flag as "May require gift tax filing"
```

**Letter Template Variables:**
- Trust name
- Grantor name
- Policy number & carrier
- Premium amount due
- Premium due date
- Requested contribution amount
- Number of beneficiaries
- Trustee contact info
- Payment instructions

**Resend Integration:**
- Use existing pattern from `send-alert-email/index.ts`
- Professional HTML email template
- Track delivery status

### 3. Frontend Component

Create `src/components/GiftRequestGenerator.tsx`:

**UI Sections:**

**A. Request Builder (Left/Top)**
- Trust/Policy selector (dropdown, searchable)
- Auto-populated fields:
  - Grantor name(s) and email(s)
  - Premium amount
  - Premium due date
  - Number of beneficiaries
- Editable fields:
  - Requested amount (with calculated suggestion)
  - Request due date (default: 30 days before premium)
  - Custom message (optional)

**B. Letter Preview (Right/Center)**
- Live preview of generated letter
- Professional formatting
- Edit capability before sending

**C. Send Options**
- Primary: "Send Email" button
- Secondary: "Download PDF" button  
- Tertiary: "Mark as Mailed" (for physical letters)

**D. Request Tracking Table (Bottom)**
- Columns: Trust, Grantor, Amount, Sent Date, Status, Actions
- Status badges: Draft (gray), Sent (blue), Reminded (amber), Received (green), Expired (red)
- Actions: Resend, Mark Received, View Letter

### 4. Integration Points

**Dashboard Integration:**
- Add "Send Gift Request" as Quick Action card on Dashboard
- Link from premium due alerts: "Premium due in 60 days → Send gift request"

**Navigation:**
- Add to Trusts & Policies tab as sub-tab, OR
- Add to Compliance tab alongside Crummey Notices

**Workflow Connection:**
- When gift is received (manual or via gift_transactions), auto-update gift_request status
- Link to Crummey notice generation

---

## Design Guidelines

Follow existing Mercury/Clio design system:
- Colors: Primary blue (#1a4971), warm grays, status colors
- Typography: DM Sans headers, Inter body
- Components: Use existing Card, Button, Table, Badge, Input, Select
- Spacing: Consistent with PremiumPaymentSummary.tsx pattern
- Cards: 8px border radius, subtle shadows, card-hover effect

---

## Acceptance Criteria

- [ ] `gift_requests` table created with proper schema and RLS
- [ ] Edge function generates HTML letter with all required fields
- [ ] Edge function sends email via Resend
- [ ] Can select policy and see auto-calculated gift amount
- [ ] Can preview letter before sending
- [ ] Can send via email with delivery confirmation
- [ ] Can download letter (HTML or PDF)
- [ ] Can mark request as mailed (for physical mail)
- [ ] Request tracking table shows all requests with status
- [ ] Can mark request as "received" when funds arrive
- [ ] Gift amount calculation respects annual exclusion limits
- [ ] Integrated into Dashboard (Quick Action or navigation)
- [ ] Follows existing design system
- [ ] V1-PROGRESS.md updated: Phase 2 → 100%

---

## Reference Files

**Patterns to follow:**
- `src/components/Reports/PremiumPaymentSummary.tsx` - Component structure
- `src/components/Reports/AuditTrailExport.tsx` - Table with filters
- `supabase/functions/send-alert-email/index.ts` - Resend email pattern
- `supabase/functions/premium-payment-summary/index.ts` - Edge function pattern

**Schema reference:**
- `docs/SCHEMA-REFERENCE.md` - Existing database schema
- `docs/V1-PROGRESS.md` - Progress tracking

---

## Execution Order

1. **Database first** - Create gift_requests table and verify
2. **Edge function** - Build generate + send + calculate endpoints
3. **React component** - Build GiftRequestGenerator.tsx
4. **Integration** - Add to Dashboard navigation
5. **Testing** - End-to-end flow verification
6. **Documentation** - Update V1-PROGRESS.md

---

## Success Metrics

After Sprint 5:
- Phase 2 (Gift Coordination): 70% → **100%**
- Overall PVD V1: 78% → **~82%**
- Remaining gaps: 4 → **3**
