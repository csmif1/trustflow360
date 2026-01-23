# AI PROMPT VALIDATION - POLICY HEALTH CHECK

## CONTEXT

Before building Sprint 3 (Policy Health Monitoring), we need to validate that our AI health check prompt produces reliable outputs. This is a focused validation exercise - NOT a full testing framework.

**TIME BOX:** Complete in under 2 hours. Do not over-engineer.

**SUCCESS CRITERIA:**
- 4 of 5 test cases match expected severity bucket (healthy/warning/critical)
- AI confidence >0.70 for all cases
- No hallucinated issues
- Complete in single session

---

## PHASE 1: CREATE SYNTHETIC TEST DATA

Create file: `tests/ai-validation/test-policies.json`

Generate 5 synthetic but realistic ILIT policy scenarios:

### POLICY 1: "test-healthy"
- All payments on time (negative days_from_due = paid early)
- Trust assets cover 3+ years of premiums
- 100% Crummey notice compliance
- Correct beneficiary designations
- **Expected:** health_score 85-95, status "healthy"

### POLICY 2: "test-warning-late-payments"  
- Deteriorating payment pattern over 4 payments
- 2022: on time → 2023: 8 days late → 2024: 15 days late → 2025: 25 days late
- Trust assets adequate
- Compliance OK
- **Expected:** health_score 60-75, status "warning", issue type "payment_pattern"

### POLICY 3: "test-warning-underfunded"
- All payments on time
- Trust assets ($22K) < next premium ($36K) 
- $14K shortfall
- Compliance OK
- **Expected:** health_score 55-70, status "warning", issue type "insufficient_funds"

### POLICY 4: "test-critical-delinquent"
- Premium 67 days overdue, payment missed entirely
- Policy in grace period, lapse imminent
- Trust assets ($3,500) nowhere near premium ($15,000)
- Pattern of worsening late payments
- 2 missing Crummey notices
- **Expected:** health_score 20-40, status "critical", issues include "premium_delinquent" and "lapse_risk"

### POLICY 5: "test-critical-compliance"
- All payments on time (financially healthy)
- Trust assets adequate
- BUT: Only 4 of 12 required Crummey notices sent (33%)
- BUT: Beneficiary designation wrong (lists "Estate of..." instead of trust)
- **Expected:** health_score 30-45, status "critical", issues include "crummey_violation" and "beneficiary_mismatch"

### JSON Structure for Each Policy:

```json
{
  "test_id": "test-healthy",
  "expected_status": "healthy",
  "expected_score_range": [85, 95],
  "expected_issues": [],
  "policy": {
    "id": "uuid",
    "policy_number": "string",
    "carrier": "string (use real carriers: Northwestern Mutual, MassMutual, etc)",
    "insured_name": "string",
    "death_benefit": "number",
    "annual_premium": "number",
    "cash_value": "number",
    "issue_date": "YYYY-MM-DD",
    "status": "active | grace_period"
  },
  "trust": {
    "name": "string Family ILIT",
    "trust_assets": "number",
    "beneficiary_count": "number",
    "type": "ILIT"
  },
  "payment_history": [
    {
      "date": "YYYY-MM-DD or null",
      "amount": "number or null",
      "status": "on_time | late | missed",
      "days_from_due": "number"
    }
  ],
  "compliance": {
    "crummey_notices_sent": "number",
    "crummey_notices_required": "number",
    "beneficiary_designations_match": "boolean",
    "trust_owns_policy": "boolean",
    "beneficiary_mismatch_details": "string or null"
  },
  "upcoming": {
    "next_premium_due": "YYYY-MM-DD",
    "days_until_due": "number or null",
    "days_overdue": "number or null",
    "premium_amount": "number"
  }
}
```

---

## PHASE 2: CREATE HEALTH CHECK PROMPT

Create file: `tests/ai-validation/health-check-prompt.ts`

Export a function that takes policy data and returns formatted prompt string.

The prompt should instruct Gemini to:
1. Analyze premium payment health (consistency, trends, delinquency)
2. Evaluate coverage adequacy (trust assets vs obligations)
3. Check compliance status (Crummey notices, beneficiary designations, ownership)
4. Calculate overall health score (0-100)
5. Determine status: healthy (80+), warning (50-79), critical (<50)
6. List all detected issues with severity
7. Provide actionable recommendations

### Expected Response Format (JSON):

```json
{
  "health_score": "number 0-100",
  "overall_status": "healthy | warning | critical",
  "component_scores": {
    "premium_payment": "number 0-100",
    "coverage_adequacy": "number 0-100",
    "compliance": "number 0-100"
  },
  "issues": [
    {
      "type": "string",
      "severity": "low | medium | high | critical",
      "description": "string",
      "requires_remediation": "boolean"
    }
  ],
  "recommendations": [
    {
      "action": "string",
      "priority": "low | medium | high | urgent",
      "description": "string"
    }
  ],
  "ai_summary": "string (2-3 sentences)",
  "confidence": "number 0-1"
}
```

---

## PHASE 3: CREATE SIMPLE TEST RUNNER

Create file: `tests/ai-validation/run-validation.ts`

Simple script that:
1. Loads test-policies.json
2. For each policy:
   - Formats the prompt using health-check-prompt.ts
   - Calls Gemini 2.5 Flash directly (use existing GEMINI_API_KEY from env)
   - Sets temperature=0 for deterministic output
   - Parses JSON response
   - Compares to expected values
   - Records pass/fail
3. Generates markdown report

**DO NOT:**
- Use complex testing frameworks
- Build elaborate infrastructure
- Add dependencies beyond what's needed for Gemini API call
- Spend time on error handling edge cases

---

## PHASE 4: GENERATE VALIDATION REPORT

Create file: `tests/ai-validation/validation-report.md` (generated by script)

### Report Format:

```markdown
# AI Health Check Prompt Validation Report
**Date:** [timestamp]
**Model:** gemini-2.5-flash
**Temperature:** 0

## Summary
- Tests Run: 5
- Passed: X
- Failed: X
- Overall: PASS/FAIL

## Results

### Test 1: test-healthy
**Expected:** health_score 85-95, status "healthy"
**Actual:** health_score [X], status "[X]"
**Result:** ✅ PASS / ❌ FAIL
**AI Summary:** [quote from response]
**Issues Detected:** [list or "None"]

[repeat for each test]

## Prompt Used
[include the full prompt template for reference]

## Recommendation
[PROCEED TO SPRINT 3 / ITERATE ON PROMPT / REVISIT ARCHITECTURE]
```

---

## PHASE 5: RUN AND COMMIT

1. Run the validation script
2. Review the generated report
3. If 4/5 pass: Commit everything with message "AI prompt validation: health check verified"
4. If <4/5 pass: Document issues, suggest prompt improvements, DO NOT iterate more than once

### Output Files:
- `tests/ai-validation/test-policies.json`
- `tests/ai-validation/health-check-prompt.ts`
- `tests/ai-validation/run-validation.ts`
- `tests/ai-validation/validation-report.md`

---

## REMINDER

Time-box to 2 hours. Simple > perfect. We're validating, not productionizing.
