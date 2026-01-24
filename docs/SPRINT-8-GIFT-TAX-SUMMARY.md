# Sprint 8: Basic Gift Tax Summary Report

**Goal:** Complete Phase 8 (Reporting) → 40% to 100%  
**Effort:** M (3-5 days) - scoped down from L (7-10 days)  
**Impact:** Overall 87% → 100% 🎉

## Scope Decision

**PVD V1 Scope:** Phase 8 = "Basic" → *"Exportable audit trail; pretty reports V2"*

**What "Basic" means for Gift Tax Summary:**
- Summary totals by donor, beneficiary, and year
- Annual exclusion tracking ($18,000/person for 2024)
- CSV export for CPA/accountant handoff
- NOT: Full Form 709 generation, lifetime exemption tracking, split-gift elections

**Why this scope:**
- Professional trustees hand off to CPAs for actual Form 709 prep
- They need the *data*, not the form itself
- Basic summary + export covers 90% of the workflow
- Full 709 integration is V2 (requires tax software partnerships)

---

## Task 1: Database Query Design

No new tables needed. Query existing `gifts` table.

**Gift Tax Summary Query:**
```sql
SELECT 
  g.donor_name,
  g.donor_email,
  b.name as beneficiary_name,
  t.trust_name,
  EXTRACT(YEAR FROM g.gift_date) as tax_year,
  SUM(g.amount) as total_gifts,
  COUNT(*) as gift_count
FROM gifts g
JOIN trusts t ON g.trust_id = t.id
JOIN beneficiaries b ON g.beneficiary_id = b.id
WHERE g.user_id = auth.uid()
GROUP BY 
  g.donor_name, 
  g.donor_email,
  b.name,
  t.trust_name,
  EXTRACT(YEAR FROM g.gift_date)
ORDER BY tax_year DESC, donor_name, beneficiary_name;
```

**Annual Exclusion Calculation:**
- 2024: $18,000 per donor per beneficiary
- 2025: $19,000 per donor per beneficiary (projected)
- Flag gifts exceeding annual exclusion (requires Form 709 filing)

---

## Task 2: Edge Function - gift-tax-summary

Create `supabase/functions/gift-tax-summary/index.ts`

### Endpoints

**GET /summary** - Get gift tax summary with filters
```json
// Request params
?year=2024&donor=John%20Smith

// Response
{
  "success": true,
  "tax_year": 2024,
  "annual_exclusion": 18000,
  "summary": [
    {
      "donor_name": "John Smith",
      "donor_email": "john@example.com",
      "beneficiary_name": "Jane Smith",
      "trust_name": "Smith Family ILIT",
      "total_gifts": 25000,
      "gift_count": 2,
      "exceeds_exclusion": true,
      "excess_amount": 7000
    }
  ],
  "totals": {
    "total_donors": 3,
    "total_beneficiaries": 5,
    "total_gift_amount": 150000,
    "gifts_exceeding_exclusion": 2
  }
}
```

**GET /export** - CSV export
```csv
Tax Year,Donor Name,Donor Email,Beneficiary,Trust,Total Gifts,Gift Count,Annual Exclusion,Excess Amount,Requires 709
2024,John Smith,john@example.com,Jane Smith,Smith Family ILIT,25000,2,18000,7000,Yes
2024,Mary Jones,mary@example.com,Tom Jones,Jones ILIT,15000,1,18000,0,No
```

---

## Task 3: UI - GiftTaxSummary Component

Create `src/components/reports/GiftTaxSummary.tsx`

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Gift Tax Summary                                    [Export] │
├─────────────────────────────────────────────────────────────┤
│ Filters:                                                     │
│ [Year ▼ 2024]  [Donor ▼ All]  [Trust ▼ All]  [Apply]       │
├─────────────────────────────────────────────────────────────┤
│ Summary Cards:                                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ $150,000 │ │    12    │ │    3     │ │    2     │        │
│ │Total Gift│ │  Gifts   │ │  Donors  │ │ Over Exc │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│ Detail Table:                                                │
│ Donor        │ Beneficiary │ Trust    │ Total  │ Status    │
│ ─────────────┼─────────────┼──────────┼────────┼────────── │
│ John Smith   │ Jane Smith  │ Smith IL │$25,000 │ ⚠️ 709    │
│ Mary Jones   │ Tom Jones   │ Jones IL │$15,000 │ ✓ Under   │
└─────────────────────────────────────────────────────────────┘
```

### Features

1. **Year selector** - Default to current year, dropdown for past years
2. **Filter by donor** - Search/select specific donor
3. **Filter by trust** - Limit to specific trust
4. **Summary cards** - Key metrics at a glance
5. **Detail table** - Sortable, shows exclusion status
6. **Status badges:**
   - ✅ "Under Exclusion" (green) - No 709 required
   - ⚠️ "Exceeds Exclusion" (amber) - 709 required, shows excess
7. **Export button** - Downloads CSV with all data

### Integration

Add "Gift Tax Summary" to Reports tab in main navigation (alongside Premium Payment Summary and Audit Trail Export from Sprint 4).

---

## Task 4: Annual Exclusion Configuration

Create simple config for annual exclusion amounts:

```typescript
// src/config/taxConstants.ts
export const ANNUAL_GIFT_EXCLUSION: Record<number, number> = {
  2023: 17000,
  2024: 18000,
  2025: 19000,
  2026: 19000, // projected
};

export const getAnnualExclusion = (year: number): number => {
  return ANNUAL_GIFT_EXCLUSION[year] || ANNUAL_GIFT_EXCLUSION[2024];
};
```

---

## Task 5: Update Documentation

### 5a. Create this file in repo
Save as `docs/SPRINT-8-GIFT-TAX-SUMMARY.md`

### 5b. Update V1-PROGRESS.md

```markdown
## Phase Status
- Phase 8: Reporting & Analytics - 100% ✅ (was 40%)

## Overall
- 100% complete 🎉

## Sprint History
- Sprint 8 (Jan 2026): Basic Gift Tax Summary Report - COMPLETE
  - Edge function: gift-tax-summary (summary + export)
  - UI: GiftTaxSummary.tsx with filters and CSV export
  - Annual exclusion tracking with 709 flagging
  - Phase 8 → 100%
  - PVD V1 COMPLETE
```

---

## Task 6: Commit

```
git add .
git commit -m "Sprint 8: Basic Gift Tax Summary Report - PVD V1 Complete"
```

---

## Success Criteria

- [ ] Summary shows totals by donor/beneficiary/year
- [ ] Annual exclusion ($18K for 2024) correctly applied
- [ ] Gifts exceeding exclusion flagged with excess amount
- [ ] CSV export works with all summary data
- [ ] Filters (year, donor, trust) work correctly
- [ ] Report accessible from Reports navigation
- [ ] V1-PROGRESS.md shows 100% complete

---

## What's NOT in V1 (Future)

- ❌ Form 709 PDF generation
- ❌ Lifetime exemption tracking ($13.61M for 2024)
- ❌ Split-gift election handling
- ❌ Direct CPA/tax software integration
- ❌ Gift tax calculation (just flags, doesn't compute tax)

These are V2 features requiring deeper tax logic and potential partnerships.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/gift-tax-summary/index.ts` | Create |
| `src/components/reports/GiftTaxSummary.tsx` | Create |
| `src/config/taxConstants.ts` | Create |
| `src/pages/attorney/Reports.tsx` | Modify (add Gift Tax tab) |
| `docs/SPRINT-8-GIFT-TAX-SUMMARY.md` | Create |
| `docs/V1-PROGRESS.md` | Update |

---

## Effort Reduction

**Original estimate:** L (7-10 days) - assumed full Form 709 integration  
**Revised estimate:** M (3-5 days) - basic summary + export only

**Why shorter:**
- No Form 709 PDF generation
- No complex tax calculations
- Reuses existing gifts table
- Simple aggregation query
- Standard export pattern (like Audit Trail Export)
