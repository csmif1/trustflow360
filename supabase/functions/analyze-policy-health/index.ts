import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import type { RemediationAlertData } from '../_shared/email-templates.ts'
import { generateRemediationAlertHTML, generateRemediationAlertText } from '../_shared/email-templates.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthCheckInput {
  policy_id: string;
  check_trigger?: 'manual' | 'scheduled' | 'alert' | 'api';
}

interface PolicyData {
  policy: any;
  ilit: any;
  trust: any;
  payment_history: any[];
  upcoming_premiums: any[];
  crummey_notices: any[];
  beneficiaries: any[];
}

interface ComponentScores {
  premium_payment: number;
  coverage_adequacy: number;
  compliance: number;
}

interface HealthIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requires_remediation: boolean;
}

interface Recommendation {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
}

interface HealthCheckResult {
  overall_status: 'healthy' | 'warning' | 'critical' | 'unknown';
  health_score: number;
  component_scores: ComponentScores;
  issues: HealthIssue[];
  recommendations: Recommendation[];
  ai_summary: string;
  ai_confidence: number;
}

/**
 * Validate input parameters
 */
function validateInput(body: any): { valid: boolean; error?: string; data?: HealthCheckInput } {
  if (!body.policy_id) {
    return { valid: false, error: 'Missing required field: policy_id' };
  }

  return {
    valid: true,
    data: {
      policy_id: body.policy_id,
      check_trigger: body.check_trigger || 'manual'
    }
  };
}

/**
 * STEP 1: Aggregate all policy-related data
 * Fetches data from multiple tables: policy, ILIT, trust, payments, notices, beneficiaries
 */
async function aggregatePolicyData(supabase: any, policyId: string): Promise<PolicyData> {
  console.log('[STEP 1] Aggregating policy data for:', policyId);

  // Fetch policy with trust info
  const { data: policy, error: policyError } = await supabase
    .from('insurance_policies')
    .select(`
      *,
      trusts!inner(
        id,
        grantor_name,
        trust_name,
        user_id,
        status,
        trustee_name,
        trustee_email,
        trust_type
      )
    `)
    .eq('id', policyId)
    .single();

  if (policyError || !policy) {
    throw new Error(`Policy not found: ${policyError?.message || 'Unknown error'}`);
  }

  const trust = policy.trusts;

  // Fetch payment history (last 12 months)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const { data: payments } = await supabase
    .from('premium_payments')
    .select('*')
    .eq('policy_id', policyId)
    .gte('payment_date', oneYearAgo.toISOString().split('T')[0])
    .order('payment_date', { ascending: false });

  // Fetch upcoming premiums
  const { data: upcomingPremiums } = await supabase
    .from('upcoming_premiums')
    .select('*')
    .eq('policy_id', policyId)
    .order('next_due_date', { ascending: true })
    .limit(1);

  // Fetch Crummey notices for this ILIT (last 12 months)
  const { data: crummeyNotices } = await supabase
    .from('crummey_notices')
    .select('*')
    .eq('trust_id', trust.id)
    .gte('notice_date', oneYearAgo.toISOString().split('T')[0])
    .order('notice_date', { ascending: false });

  // Fetch beneficiaries
  const { data: beneficiaries } = await supabase
    .from('beneficiaries')
    .select('*')
    .eq('trust_id', trust.id);

  console.log('[STEP 1] Data aggregated:', {
    policy: policy.policy_number,
    payments: payments?.length || 0,
    notices: crummeyNotices?.length || 0,
    beneficiaries: beneficiaries?.length || 0
  });

  return {
    policy,
    ilit: trust, // Trust is the ILIT in this schema
    trust,
    payment_history: payments || [],
    upcoming_premiums: upcomingPremiums || [],
    crummey_notices: crummeyNotices || [],
    beneficiaries: beneficiaries || []
  };
}

/**
 * STEP 2: Calculate rule-based component scores (70% of final score)
 * Premium Payment: 40%, Coverage Adequacy: 30%, Compliance: 30%
 */
function calculateRuleBasedScores(data: PolicyData): {
  scores: ComponentScores;
  issues: HealthIssue[];
  recommendations: Recommendation[];
} {
  console.log('[STEP 2] Calculating rule-based scores...');

  const issues: HealthIssue[] = [];
  const recommendations: Recommendation[] = [];

  // === PREMIUM PAYMENT SCORE (40% weight) ===
  let premiumScore = 100;
  const payments = data.payment_history;
  const nextPremium = data.upcoming_premiums[0];

  // Check if policy is in grace period or lapsed
  if (data.policy.policy_status === 'grace_period') {
    premiumScore = 20;
    issues.push({
      type: 'premium_delinquent',
      severity: 'critical',
      description: `Policy is in grace period. Immediate payment required to prevent lapse.`,
      requires_remediation: true
    });
    recommendations.push({
      action: 'pay_premium',
      priority: 'urgent',
      description: 'Pay overdue premium immediately to prevent policy lapse'
    });
  } else if (data.policy.policy_status === 'lapsed') {
    premiumScore = 0;
    issues.push({
      type: 'lapse_risk',
      severity: 'critical',
      description: 'Policy has lapsed. Reinstatement may be required.',
      requires_remediation: true
    });
  } else if (nextPremium) {
    // Check if premium is overdue
    const daysUntilDue = nextPremium.days_until_due || 0;

    if (daysUntilDue < 0) {
      const daysOverdue = Math.abs(daysUntilDue);
      if (daysOverdue > 30) {
        premiumScore = 30;
        issues.push({
          type: 'premium_delinquent',
          severity: 'critical',
          description: `Premium is ${daysOverdue} days overdue`,
          requires_remediation: true
        });
      } else if (daysOverdue > 15) {
        premiumScore = 60;
        issues.push({
          type: 'premium_delinquent',
          severity: 'high',
          description: `Premium is ${daysOverdue} days overdue`,
          requires_remediation: true
        });
      }
    }

    // Analyze payment pattern (trend analysis)
    if (payments.length >= 3) {
      const lateDays = payments.slice(0, 3).map(p => {
        if (!p.payment_date || !data.policy.premium_due_date) return 0;
        const paid = new Date(p.payment_date);
        const due = new Date(data.policy.premium_due_date);
        return Math.floor((paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      });

      // Check for deteriorating pattern
      const isDeterioration = lateDays[0] > lateDays[1] && lateDays[1] > lateDays[2];
      if (isDeterioration && lateDays[0] > 15) {
        premiumScore = Math.min(premiumScore, 70);
        issues.push({
          type: 'payment_pattern',
          severity: 'medium',
          description: 'Payment pattern showing increasing delays',
          requires_remediation: false
        });
        recommendations.push({
          action: 'contact_trustee',
          priority: 'medium',
          description: 'Discuss payment timing with trustee to prevent future delays'
        });
      }
    }
  }

  // === COVERAGE ADEQUACY SCORE (30% weight) ===
  let coverageScore = 100;

  // Get trust assets from fund sufficiency checks
  const annualPremium = data.policy.annual_premium || 0;
  // For now, we'll estimate trust assets - in production, fetch from fund_sufficiency_checks
  const trustAssets = 100000; // TODO: Fetch actual trust assets

  if (annualPremium > 0) {
    const runwayYears = trustAssets / annualPremium;

    if (runwayYears < 1) {
      coverageScore = 30;
      issues.push({
        type: 'insufficient_funds',
        severity: 'critical',
        description: `Trust assets ($${trustAssets.toLocaleString()}) insufficient to cover next premium ($${annualPremium.toLocaleString()})`,
        requires_remediation: true
      });
      recommendations.push({
        action: 'fund_trust',
        priority: 'urgent',
        description: `Trust needs immediate funding of at least $${Math.ceil(annualPremium - trustAssets).toLocaleString()}`
      });
    } else if (runwayYears < 2) {
      coverageScore = 65;
      issues.push({
        type: 'insufficient_funds',
        severity: 'high',
        description: `Limited funding runway: ${runwayYears.toFixed(1)} years`,
        requires_remediation: true
      });
      recommendations.push({
        action: 'fund_trust',
        priority: 'high',
        description: 'Plan trust funding to ensure 3+ years of premium coverage'
      });
    } else if (runwayYears < 3) {
      coverageScore = 85;
      recommendations.push({
        action: 'fund_trust',
        priority: 'medium',
        description: 'Consider additional trust funding for long-term sustainability'
      });
    }
  }

  // === COMPLIANCE SCORE (30% weight) ===
  let complianceScore = 100;

  // Check Crummey notice compliance
  const totalBeneficiaries = data.beneficiaries.length;
  const paymentsLastYear = payments.length;
  const requiredNotices = totalBeneficiaries * paymentsLastYear;
  const sentNotices = data.crummey_notices.filter(n => n.notice_status === 'sent').length;

  if (requiredNotices > 0) {
    const complianceRate = sentNotices / requiredNotices;

    if (complianceRate < 0.80) {
      complianceScore = 40;
      issues.push({
        type: 'crummey_violation',
        severity: 'critical',
        description: `Only ${Math.round(complianceRate * 100)}% Crummey notice compliance (${sentNotices}/${requiredNotices}). IRS gift tax issues may arise.`,
        requires_remediation: true
      });
      recommendations.push({
        action: 'review_compliance',
        priority: 'urgent',
        description: 'Send missing Crummey notices and consult tax advisor about potential gift tax implications'
      });
    } else if (complianceRate < 0.95) {
      complianceScore = 75;
      issues.push({
        type: 'crummey_violation',
        severity: 'medium',
        description: `${Math.round(complianceRate * 100)}% Crummey notice compliance`,
        requires_remediation: true
      });
    }
  }

  // Check beneficiary designation (simplified - in production, check against policy)
  // For now, just verify trust owns the policy
  if (data.policy.policy_owner && !data.policy.policy_owner.includes('Trust')) {
    complianceScore = Math.min(complianceScore, 50);
    issues.push({
      type: 'ownership_issue',
      severity: 'critical',
      description: `Policy owner "${data.policy.policy_owner}" may not match trust structure`,
      requires_remediation: true
    });
    recommendations.push({
      action: 'verify_ownership',
      priority: 'urgent',
      description: 'Verify policy ownership matches ILIT structure to avoid estate tax issues'
    });
  }

  console.log('[STEP 2] Rule-based scores calculated:', {
    premium: premiumScore,
    coverage: coverageScore,
    compliance: complianceScore
  });

  return {
    scores: {
      premium_payment: premiumScore,
      coverage_adequacy: coverageScore,
      compliance: complianceScore
    },
    issues,
    recommendations
  };
}

/**
 * STEP 3: Call Gemini AI for additional analysis (30% influence)
 * Uses validated prompt from tests/ai-validation
 */
async function callGeminiAI(data: PolicyData, ruleScores: ComponentScores, apiKey: string): Promise<{
  aiSummary: string;
  aiConfidence: number;
  aiIssues: HealthIssue[];
  aiRecommendations: Recommendation[];
}> {
  console.log('[STEP 3] Calling Gemini AI for analysis...');

  const startTime = Date.now();

  // Build prompt similar to validation tests
  const nextPremium = data.upcoming_premiums[0];
  const daysUntilDue = nextPremium?.days_until_due || null;
  const daysOverdue = (daysUntilDue !== null && daysUntilDue < 0) ? Math.abs(daysUntilDue) : null;

  const prompt = `You are an expert insurance compliance analyst specializing in Irrevocable Life Insurance Trusts (ILITs). Analyze the following policy and trust data to assess overall policy health.

## POLICY INFORMATION
- Policy Number: ${data.policy.policy_number}
- Carrier: ${data.policy.carrier}
- Insured: ${data.policy.insured_name}
- Death Benefit: $${data.policy.death_benefit?.toLocaleString() || 'N/A'}
- Annual Premium: $${data.policy.annual_premium?.toLocaleString() || 'N/A'}
- Cash Value: $${data.policy.cash_value?.toLocaleString() || 'N/A'}
- Issue Date: ${data.policy.issue_date || 'N/A'}
- Current Status: ${data.policy.policy_status}

## TRUST INFORMATION
- Trust Name: ${data.trust.trust_name}
- Trust Type: ${data.trust.trust_type || 'ILIT'}
- Trustee: ${data.trust.trustee_name || 'N/A'}
- Beneficiary Count: ${data.beneficiaries.length}

## PAYMENT HISTORY (Last ${data.payment_history.length} Payments)
${data.payment_history.slice(0, 4).map((p, idx) =>
  `${idx + 1}. ${p.payment_date} - $${p.amount?.toLocaleString()} - ${p.status}`
).join('\n') || 'No recent payments'}

## UPCOMING PREMIUM
${nextPremium ? `
- Next Premium Due: ${nextPremium.next_due_date}
- Amount Due: $${nextPremium.amount_due?.toLocaleString()}
${daysOverdue ? `- ⚠️ OVERDUE by ${daysOverdue} days` : `- Days Until Due: ${daysUntilDue}`}
` : '- No upcoming premium data available'}

## COMPLIANCE STATUS
- Crummey Notices Sent: ${data.crummey_notices.filter(n => n.notice_status === 'sent').length} (last 12 months)
- Total Beneficiaries: ${data.beneficiaries.length}
- Policy Owner: ${data.policy.policy_owner || 'Unknown'}

## RULE-BASED SCORES (Reference)
- Premium Payment: ${ruleScores.premium_payment}/100
- Coverage Adequacy: ${ruleScores.coverage_adequacy}/100
- Compliance: ${ruleScores.compliance}/100

---

## YOUR ANALYSIS TASK

Provide a supplementary AI analysis. Focus on pattern recognition and nuanced insights that rule-based logic may miss.

Return ONLY valid JSON (no markdown, no explanations outside the JSON):

{
  "ai_summary": "2-3 sentence executive summary of policy health emphasizing key findings",
  "confidence": <number 0.0-1.0 representing your confidence in this assessment>,
  "additional_insights": [
    {
      "type": "payment_pattern" | "insufficient_funds" | "crummey_violation" | "ownership_issue" | "other",
      "severity": "low" | "medium" | "high" | "critical",
      "description": "string",
      "requires_remediation": true | false
    }
  ],
  "ai_recommendations": [
    {
      "action": "string",
      "priority": "low" | "medium" | "high" | "urgent",
      "description": "string"
    }
  ]
}

**IMPORTANT:**
- Only report insights NOT already captured by rule-based scores
- Focus on pattern recognition and contextual analysis
- Do not hallucinate problems that don't exist
- Confidence should reflect data quality and clarity
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse JSON response
    let aiResult;
    try {
      // Remove markdown code blocks if present
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7);
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.substring(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.substring(0, jsonText.length - 3);
      }
      jsonText = jsonText.trim();

      aiResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[STEP 3] Failed to parse AI response:', parseError);
      return {
        aiSummary: 'AI analysis unavailable due to parsing error',
        aiConfidence: 0.5,
        aiIssues: [],
        aiRecommendations: []
      };
    }

    const processingTime = Date.now() - startTime;
    console.log('[STEP 3] AI analysis complete:', {
      confidence: aiResult.confidence,
      processingTime: `${processingTime}ms`
    });

    return {
      aiSummary: aiResult.ai_summary || 'No AI summary available',
      aiConfidence: aiResult.confidence || 0.5,
      aiIssues: aiResult.additional_insights || [],
      aiRecommendations: aiResult.ai_recommendations || []
    };

  } catch (error) {
    console.error('[STEP 3] AI analysis error:', error);
    return {
      aiSummary: `AI analysis failed: ${error.message}`,
      aiConfidence: 0.0,
      aiIssues: [],
      aiRecommendations: []
    };
  }
}

/**
 * STEP 4: Calculate hybrid health score (70% rules + 30% AI)
 * and determine overall status
 */
function calculateHybridScore(
  ruleScores: ComponentScores,
  aiConfidence: number
): { healthScore: number; overallStatus: string } {
  console.log('[STEP 4] Calculating hybrid health score...');

  // Weighted component scores (sums to 1.0)
  const premiumWeight = 0.40;
  const coverageWeight = 0.30;
  const complianceWeight = 0.30;

  // Rule-based score (70% weight)
  const ruleBasedScore =
    (ruleScores.premium_payment * premiumWeight) +
    (ruleScores.coverage_adequacy * coverageWeight) +
    (ruleScores.compliance * complianceWeight);

  // AI influence (30% weight) - adjusts score based on AI confidence
  // High confidence AI can nudge score up/down slightly
  const aiInfluence = (aiConfidence - 0.5) * 20; // Max ±10 points
  const hybridScore = Math.max(0, Math.min(100, ruleBasedScore + aiInfluence * 0.30));

  // Determine overall status
  let overallStatus: string;
  if (hybridScore >= 80) {
    overallStatus = 'healthy';
  } else if (hybridScore >= 50) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'critical';
  }

  console.log('[STEP 4] Hybrid score calculated:', {
    ruleBasedScore: ruleBasedScore.toFixed(2),
    aiInfluence: aiInfluence.toFixed(2),
    finalScore: hybridScore.toFixed(2),
    status: overallStatus
  });

  return {
    healthScore: Math.round(hybridScore * 100) / 100, // Round to 2 decimals
    overallStatus
  };
}

/**
 * Main handler
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()

    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { policy_id, check_trigger } = validation.data!;

    console.log('='.repeat(60));
    console.log('POLICY HEALTH CHECK STARTED');
    console.log(`Policy ID: ${policy_id}`);
    console.log(`Trigger: ${check_trigger}`);
    console.log('='.repeat(60));

    // STEP 1: Aggregate data
    const policyData = await aggregatePolicyData(supabase, policy_id);

    // STEP 2: Calculate rule-based scores
    const ruleBasedAnalysis = calculateRuleBasedScores(policyData);

    // STEP 3: Call Gemini AI
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const aiAnalysis = await callGeminiAI(policyData, ruleBasedAnalysis.scores, geminiApiKey);

    // STEP 4: Calculate hybrid score
    const { healthScore, overallStatus } = calculateHybridScore(
      ruleBasedAnalysis.scores,
      aiAnalysis.aiConfidence
    );

    // Combine issues and recommendations
    const allIssues = [...ruleBasedAnalysis.issues, ...aiAnalysis.aiIssues];
    const allRecommendations = [...ruleBasedAnalysis.recommendations, ...aiAnalysis.aiRecommendations];

    // Determine remediation priority
    const hasCriticalIssues = allIssues.some(i => i.severity === 'critical');
    const hasHighIssues = allIssues.some(i => i.severity === 'high');
    const remediationPriority = hasCriticalIssues ? 'urgent' : hasHighIssues ? 'high' : 'medium';

    // STEP 5: Store health check result
    const healthCheckData = {
      policy_id: policy_id,
      trust_id: policyData.trust.id,
      check_date: new Date().toISOString().split('T')[0],
      overall_status: overallStatus,
      health_score: healthScore,
      component_scores: ruleBasedAnalysis.scores,
      premium_payment_status: policyData.policy.policy_status === 'grace_period' ? 'delinquent' : 'current',
      coverage_adequacy_score: ruleBasedAnalysis.scores.coverage_adequacy,
      ai_analysis_summary: aiAnalysis.aiSummary,
      ai_model_version: 'gemini-2.5-flash',
      ai_confidence_score: aiAnalysis.aiConfidence,
      issues_detected: allIssues,
      recommendations: allRecommendations,
      remediation_required: allIssues.some(i => i.requires_remediation),
      remediation_priority: remediationPriority,
      remediation_status: 'pending',
      check_trigger: check_trigger,
      created_at: new Date().toISOString()
    };

    const { data: healthCheck, error: healthCheckError } = await supabase
      .from('policy_health_checks')
      .insert(healthCheckData)
      .select()
      .single();

    if (healthCheckError) {
      console.error('Error storing health check:', healthCheckError);
      throw new Error(`Failed to store health check: ${healthCheckError.message}`);
    }

    console.log('[STEP 5] Health check stored:', healthCheck.id);

    // STEP 6: Auto-create remediation actions for critical/high issues
    const criticalActions = allIssues
      .filter(i => i.requires_remediation && (i.severity === 'critical' || i.severity === 'high'))
      .map(issue => {
        const matchingRec = allRecommendations.find(r =>
          r.action.includes(issue.type) || r.description.toLowerCase().includes(issue.type)
        );

        return {
          health_check_id: healthCheck.id,
          policy_id: policy_id,
          action_type: issue.type === 'premium_delinquent' ? 'pay_premium' :
                      issue.type === 'insufficient_funds' ? 'fund_trust' :
                      issue.type === 'crummey_violation' ? 'review_compliance' :
                      issue.type === 'ownership_issue' ? 'verify_ownership' :
                      'custom',
          priority: issue.severity === 'critical' ? 'urgent' : 'high',
          title: issue.description.substring(0, 100),
          description: issue.description,
          ai_suggested: aiAnalysis.aiIssues.includes(issue),
          ai_recommendation_text: matchingRec?.description || null,
          due_date: new Date(Date.now() + (issue.severity === 'critical' ? 3 : 7) * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0],
          status: 'pending'
        };
      });

    let remediationActionsCreated = 0;
    let emailAlertSent = false;

    if (criticalActions.length > 0) {
      const { data: createdActions, error: actionsError } = await supabase
        .from('remediation_actions')
        .insert(criticalActions)
        .select();

      if (actionsError) {
        console.error('Error creating remediation actions:', actionsError);
      } else {
        remediationActionsCreated = createdActions.length;
        console.log(`[STEP 6] Created ${remediationActionsCreated} remediation actions`);

        // STEP 7: Send remediation alert email to trustee
        if (policyData.trust.trustee_email && createdActions.length > 0) {
          try {
            console.log(`[STEP 7] Sending remediation alert to ${policyData.trust.trustee_email}`);

            const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

            // Prepare email data
            const emailData: RemediationAlertData = {
              trustee_name: policyData.trust.trustee_name || 'Trustee',
              trustee_email: policyData.trust.trustee_email,
              trust_name: policyData.trust.trust_name,
              policy_number: policyData.policy.policy_number,
              carrier: policyData.policy.carrier,
              overall_status: overallStatus,
              health_score: healthScore,
              check_date: new Date().toISOString(),
              issues: allIssues
                .filter(i => i.severity === 'critical' || i.severity === 'high')
                .map(i => ({
                  type: i.type,
                  severity: i.severity,
                  description: i.description
                })),
              remediation_actions: createdActions.map((action: any) => ({
                title: action.title,
                action_type: action.action_type,
                priority: action.priority,
                due_date: action.due_date,
                days_until_due: Math.ceil((new Date(action.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              }))
            };

            const htmlContent = generateRemediationAlertHTML(emailData);
            const textContent = generateRemediationAlertText(emailData);

            const result = await resend.emails.send({
              from: 'TrustFlow360 <alerts@trustflow360.com>',
              to: [policyData.trust.trustee_email],
              subject: `[${overallStatus.toUpperCase()}] Policy Health Alert - ${policyData.trust.trust_name}`,
              html: htmlContent,
              text: textContent
            });

            if (result.error) {
              console.error('Error sending remediation alert:', result.error);
            } else {
              console.log(`[STEP 7] Remediation alert sent successfully. Email ID: ${result.data?.id}`);
              emailAlertSent = true;

              // Update remediation actions to mark email sent
              const actionIds = createdActions.map((a: any) => a.id);
              await supabase
                .from('remediation_actions')
                .update({ email_alert_sent: true })
                .in('id', actionIds);
            }
          } catch (emailError) {
            console.error('Error sending remediation alert email:', emailError);
          }
        } else {
          console.log('[STEP 7] No trustee email configured, skipping alert');
        }
      }
    }

    console.log('='.repeat(60));
    console.log('POLICY HEALTH CHECK COMPLETED');
    console.log(`Overall Status: ${overallStatus.toUpperCase()}`);
    console.log(`Health Score: ${healthScore}/100`);
    console.log(`Issues Found: ${allIssues.length}`);
    console.log(`Remediation Actions: ${remediationActionsCreated}`);
    console.log(`Email Alert Sent: ${emailAlertSent}`);
    console.log('='.repeat(60));

    return new Response(
      JSON.stringify({
        success: true,
        health_check_id: healthCheck.id,
        overall_status: overallStatus,
        health_score: healthScore,
        component_scores: ruleBasedAnalysis.scores,
        issues_count: allIssues.length,
        remediation_actions_created: remediationActionsCreated,
        email_alert_sent: emailAlertSent,
        trustee_email: policyData.trust.trustee_email || null,
        ai_confidence: aiAnalysis.aiConfidence,
        execution_timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in analyze-policy-health:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
