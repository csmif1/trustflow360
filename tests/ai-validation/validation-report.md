# AI Health Check Prompt Validation Report
**Date:** 2026-01-23T17:07:34.247Z
**Model:** gemini-2.5-flash
**Temperature:** 0

## Summary
- Tests Run: 5
- Passed: 0
- Failed: 5
- Overall: ❌ FAIL (0/5 required 4/5)

## Results

### Test: test-healthy
**Expected:** health_score 85-100, status "healthy"
**Actual:** health_score 0, status "error"
**Confidence:** 0.0%
**Result:** ❌ FAIL

**Failures:**
- API call failed: Unterminated string in JSON at position 1353 (line 27 column 284)

**AI Summary:** Test failed with error: Unterminated string in JSON at position 1353 (line 27 column 284)

**Issues Detected:** None

---

### Test: test-warning-late-payments
**Expected:** health_score 60-75, status "warning"
**Actual:** health_score 0, status "error"
**Confidence:** 0.0%
**Result:** ❌ FAIL

**Failures:**
- API call failed: Unterminated string in JSON at position 172 (line 9 column 10)

**AI Summary:** Test failed with error: Unterminated string in JSON at position 172 (line 9 column 10)

**Expected Issues:** payment_pattern
**Issues Detected:** None

---

### Test: test-warning-underfunded
**Expected:** health_score 55-70, status "warning"
**Actual:** health_score 77.5, status "warning"
**Confidence:** 100.0%
**Result:** ❌ FAIL

**Failures:**
- Score out of range: expected 55-70, got 77.5

**AI Summary:** The policy exhibits strong premium payment history and excellent compliance. However, a critical funding gap exists as the trust's current assets of $22,000 are insufficient to cover the next $36,000 premium due in 231 days, placing the policy in a warning status. Urgent action is required to fund the trust.

**Expected Issues:** insufficient_funds
**Issues Detected:** insufficient_funds

---

### Test: test-critical-delinquent
**Expected:** health_score 20-40, status "critical"
**Actual:** health_score 0, status "error"
**Confidence:** 0.0%
**Result:** ❌ FAIL

**Failures:**
- API call failed: Expected property name or '}' in JSON at position 180 (line 10 column 6)

**AI Summary:** Test failed with error: Expected property name or '}' in JSON at position 180 (line 10 column 6)

**Expected Issues:** premium_delinquent, lapse_risk
**Issues Detected:** None

---

### Test: test-critical-compliance
**Expected:** health_score 30-45, status "critical"
**Actual:** health_score 0, status "error"
**Confidence:** 0.0%
**Result:** ❌ FAIL

**Failures:**
- API call failed: Unexpected end of JSON input

**AI Summary:** Test failed with error: Unexpected end of JSON input

**Expected Issues:** crummey_violation, beneficiary_mismatch
**Issues Detected:** None

---

## Prompt Used

The following prompt template was used (shown with test-healthy data as example):

```
You are an expert insurance compliance analyst specializing in Irrevocable Life Insurance Trusts (ILITs). Analyze the following policy and trust data to assess overall policy health.

## POLICY INFORMATION
- Policy Number: NWM-2019-847562
- Carrier: Northwestern Mutual
- Insured: Robert Anderson
- Death Benefit: $5,000,000
- Annual Premium: $36,000
- Cash Value: $142,000
- Issue Date: 2019-03-15
- Current Status: active

## TRUST INFORMATION
- Trust Name: Anderson Family ILIT
- Trust Type: ILIT
- Trust Assets Available: $125,000
- Beneficiary Count: 3

## PAYMENT HISTORY (Last 4 Years)
1. 2022-03-10 - $36,000 - on_time (-5 days from due date)
2. 2023-03-12 - $36,000 - on_time (-3 days from due date)
3. 2024-03-08 - $36,000 - on_time (-7 days from due date)
4. 2025-03-14 - $36,000 - on_time (-1 days from due date)

## UPCOMING PREMIUM
- Next Premium Due: 2026-03-15
- Amount Due: $36,000
- Days Until Due: 51

## COMPLIANCE STATUS
- Crummey Notices: 12 of 12 sent (100%)
- Beneficiary Designations Match Trust: YES ✓
- Trust Owns Policy: YES ✓


---

## YOUR ANALYSIS TASK

Perform a comprehensive health check of this ILIT policy. Evaluate three key dimensions:

### 1. PREMIUM PAYMENT HEALTH (0-100 score)
Analyze:
- Payment consistency and reliability
- Trends over time (improving, stable, deteriorating)
- Current delinquency status
- Risk of policy lapse

**Critical Thresholds:**
- Policy in grace period = critical issue
- 30+ days overdue = high severity
- Deteriorating payment pattern (increasing late days) = warning
- Missed payments = critical issue

### 2. COVERAGE ADEQUACY (0-100 score)
Analyze:
- Trust assets vs next premium due
- Runway (years of coverage at current premium)
- Funding shortfalls

**Critical Thresholds:**
- Trust assets < next premium = critical funding gap
- Trust assets < 2x annual premium = warning (limited runway)
- Trust assets >= 3x annual premium = healthy

### 3. COMPLIANCE (0-100 score)
Analyze:
- Crummey notice compliance rate
- Beneficiary designation accuracy
- Trust ownership verification

**Critical Thresholds:**
- <80% Crummey notices sent = critical violation (IRS gift tax issues)
- Beneficiary mismatch = critical issue (estate tax exposure)
- Trust does not own policy = critical structural flaw

### OVERALL HEALTH SCORE (0-100)
Calculate weighted average:
- Premium Payment: 40%
- Coverage Adequacy: 30%
- Compliance: 30%

**Status Determination:**
- 80-100 = "healthy"
- 50-79 = "warning"
- 0-49 = "critical"

### ISSUE DETECTION
For each problem found, specify:
- **type**: payment_pattern | premium_delinquent | lapse_risk | insufficient_funds | crummey_violation | beneficiary_mismatch | ownership_issue
- **severity**: low | medium | high | critical
- **description**: Clear explanation of the issue
- **requires_remediation**: true if immediate action needed

### RECOMMENDATIONS
For each issue, provide:
- **action**: Specific corrective action
- **priority**: low | medium | high | urgent
- **description**: Why this action is needed

---

## RESPONSE FORMAT

Return ONLY valid JSON (no markdown, no explanations outside the JSON):

{
  "health_score": <number 0-100>,
  "overall_status": "healthy" | "warning" | "critical",
  "component_scores": {
    "premium_payment": <number 0-100>,
    "coverage_adequacy": <number 0-100>,
    "compliance": <number 0-100>
  },
  "issues": [
    {
      "type": "string",
      "severity": "low" | "medium" | "high" | "critical",
      "description": "string",
      "requires_remediation": true | false
    }
  ],
  "recommendations": [
    {
      "action": "string",
      "priority": "low" | "medium" | "high" | "urgent",
      "description": "string"
    }
  ],
  "ai_summary": "2-3 sentence executive summary of policy health",
  "confidence": <number 0.0-1.0 representing your confidence in this assessment>
}

**IMPORTANT:**
- Be precise with numerical scores
- Only report issues that are actually present in the data
- Do not hallucinate problems that don't exist
- Confidence should reflect data quality and clarity
- If all metrics are healthy, issues array should be empty

```

## Recommendation

⚠️ **ITERATE ON PROMPT**

Only 0 out of 5 test cases passed. Review the failures above and consider:
- Adjusting scoring thresholds in the prompt
- Clarifying issue type definitions
- Adding more explicit examples for edge cases
- Reviewing the weighting of component scores

Re-run validation after prompt improvements.
