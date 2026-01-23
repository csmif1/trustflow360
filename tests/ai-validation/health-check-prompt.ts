/**
 * AI Health Check Prompt Generator
 * Generates structured prompt for Gemini 2.5 Flash to analyze ILIT policy health
 */

export interface PolicyTestData {
  test_id: string;
  expected_status: string;
  expected_score_range: [number, number];
  expected_issues: string[];
  policy: {
    id: string;
    policy_number: string;
    carrier: string;
    insured_name: string;
    death_benefit: number;
    annual_premium: number;
    cash_value: number;
    issue_date: string;
    status: string;
  };
  trust: {
    name: string;
    trust_assets: number;
    beneficiary_count: number;
    type: string;
  };
  payment_history: Array<{
    date: string | null;
    amount: number | null;
    status: string;
    days_from_due: number | null;
  }>;
  compliance: {
    crummey_notices_sent: number;
    crummey_notices_required: number;
    beneficiary_designations_match: boolean;
    trust_owns_policy: boolean;
    beneficiary_mismatch_details: string | null;
  };
  upcoming: {
    next_premium_due: string;
    days_until_due: number | null;
    days_overdue: number | null;
    premium_amount: number;
  };
}

export function generateHealthCheckPrompt(policyData: PolicyTestData): string {
  return `You are an expert insurance compliance analyst specializing in Irrevocable Life Insurance Trusts (ILITs). Analyze the following policy and trust data to assess overall policy health.

## POLICY INFORMATION
- Policy Number: ${policyData.policy.policy_number}
- Carrier: ${policyData.policy.carrier}
- Insured: ${policyData.policy.insured_name}
- Death Benefit: $${policyData.policy.death_benefit.toLocaleString()}
- Annual Premium: $${policyData.policy.annual_premium.toLocaleString()}
- Cash Value: $${policyData.policy.cash_value.toLocaleString()}
- Issue Date: ${policyData.policy.issue_date}
- Current Status: ${policyData.policy.status}

## TRUST INFORMATION
- Trust Name: ${policyData.trust.name}
- Trust Type: ${policyData.trust.type}
- Trust Assets Available: $${policyData.trust.trust_assets.toLocaleString()}
- Beneficiary Count: ${policyData.trust.beneficiary_count}

## PAYMENT HISTORY (Last 4 Years)
${policyData.payment_history.map((payment, idx) => {
  if (payment.status === 'missed') {
    return `${idx + 1}. ${payment.status.toUpperCase()} - Payment not made`;
  }
  return `${idx + 1}. ${payment.date} - $${payment.amount?.toLocaleString()} - ${payment.status} (${payment.days_from_due! > 0 ? '+' : ''}${payment.days_from_due} days from due date)`;
}).join('\n')}

## UPCOMING PREMIUM
- Next Premium Due: ${policyData.upcoming.next_premium_due}
- Amount Due: $${policyData.upcoming.premium_amount.toLocaleString()}
${policyData.upcoming.days_overdue ? `- ⚠️ OVERDUE by ${policyData.upcoming.days_overdue} days` : `- Days Until Due: ${policyData.upcoming.days_until_due}`}

## COMPLIANCE STATUS
- Crummey Notices: ${policyData.compliance.crummey_notices_sent} of ${policyData.compliance.crummey_notices_required} sent (${Math.round(policyData.compliance.crummey_notices_sent / policyData.compliance.crummey_notices_required * 100)}%)
- Beneficiary Designations Match Trust: ${policyData.compliance.beneficiary_designations_match ? 'YES ✓' : 'NO ✗'}
- Trust Owns Policy: ${policyData.compliance.trust_owns_policy ? 'YES ✓' : 'NO ✗'}
${policyData.compliance.beneficiary_mismatch_details ? `- Mismatch Details: ${policyData.compliance.beneficiary_mismatch_details}` : ''}

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
`;
}
