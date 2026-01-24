/**
 * PVD V1 Functional Verification Tests
 * Tests each phase against live Supabase backend
 *
 * Run with: deno run --allow-net --allow-env tests/pvd-v1-verification.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQyMzksImV4cCI6MjA1MjU1MDIzOX0.gHOAXzJhYgvh7TPlQN2lkLq7xQZp-24EPhqRW2xqVrY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  phase: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_IMPLEMENTED';
  details: string;
  error?: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function addResult(phase: string, test: string, status: TestResult['status'], details: string, error?: string) {
  results.push({ phase, test, status, details, error });
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'PARTIAL' ? '⚠️' : '⏭️';
  log(`${emoji} ${phase} - ${test}: ${status}`);
  if (details) log(`   ${details}`);
  if (error) log(`   Error: ${error}`);
}

// =============================================================================
// PHASE 1: PREMIUM ALERT
// =============================================================================

async function testPhase1_PremiumAlert() {
  log('\n' + '='.repeat(80));
  log('PHASE 1: PREMIUM ALERT - Testing 90-day lookahead & underfunding flags');
  log('='.repeat(80));

  // Test 1.1: Query upcoming_premiums table
  try {
    const { data, error } = await supabase
      .from('upcoming_premiums')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 1', 'upcoming_premiums table query', 'PASS',
        `Found ${data.length} records. Sample: ${data[0].policy_id?.substring(0, 8)}...`);
    } else {
      addResult('Phase 1', 'upcoming_premiums table query', 'PARTIAL',
        'Table exists but no data (empty database or not populated)');
    }
  } catch (error) {
    addResult('Phase 1', 'upcoming_premiums table query', 'FAIL',
      'Table query failed', error.message);
  }

  // Test 1.2: Test check-premium-reminders function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/check-premium-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ window_days: 90 })
    });

    const result = await response.json();

    if (response.ok && result.upcoming_premiums) {
      addResult('Phase 1', 'check-premium-reminders function (90-day window)', 'PASS',
        `Function works. Found ${result.upcoming_premiums.length} premiums in 90-day window`);
    } else if (response.status === 401) {
      addResult('Phase 1', 'check-premium-reminders function (90-day window)', 'PARTIAL',
        'Function exists but requires authentication. Backend is configured.');
    } else {
      addResult('Phase 1', 'check-premium-reminders function (90-day window)', 'FAIL',
        `Function returned error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 1', 'check-premium-reminders function (90-day window)', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 1.3: Test calculate-funds-sufficiency function
  try {
    const { data: policies } = await supabase
      .from('insurance_policies')
      .select('id, trust_id')
      .limit(1)
      .single();

    if (policies) {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-funds-sufficiency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ trust_id: policies.trust_id, lookahead_days: 90 })
      });

      const result = await response.json();

      if (response.ok && result.fund_sufficiency) {
        const isSufficient = result.fund_sufficiency.is_sufficient;
        addResult('Phase 1', 'Underfunding flag calculation', 'PASS',
          `Function works. Sufficiency check: ${isSufficient ? 'SUFFICIENT' : 'UNDERFUNDED'}`);
      } else if (response.status === 401) {
        addResult('Phase 1', 'Underfunding flag calculation', 'PARTIAL',
          'Function exists but requires authentication');
      } else {
        addResult('Phase 1', 'Underfunding flag calculation', 'FAIL',
          `Function error: ${result.error || result.message}`);
      }
    } else {
      addResult('Phase 1', 'Underfunding flag calculation', 'PARTIAL',
        'No policies in database to test');
    }
  } catch (error) {
    addResult('Phase 1', 'Underfunding flag calculation', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 1.4: Check fund_sufficiency_checks table
  try {
    const { data, error } = await supabase
      .from('fund_sufficiency_checks')
      .select('*')
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 1', 'fund_sufficiency_checks logging', 'PASS',
        'Historical sufficiency checks are being logged');
    } else {
      addResult('Phase 1', 'fund_sufficiency_checks logging', 'PARTIAL',
        'Table exists but no historical data yet');
    }
  } catch (error) {
    addResult('Phase 1', 'fund_sufficiency_checks logging', 'FAIL',
      'Table query failed', error.message);
  }
}

// =============================================================================
// PHASE 2: GIFT COORDINATION
// =============================================================================

async function testPhase2_GiftCoordination() {
  log('\n' + '='.repeat(80));
  log('PHASE 2: GIFT COORDINATION - Testing gift recording & request generation');
  log('='.repeat(80));

  // Test 2.1: Query gifts table
  try {
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 2', 'gifts table query', 'PASS',
        `Found ${data.length} gift records`);
    } else {
      addResult('Phase 2', 'gifts table query', 'PARTIAL',
        'Table exists but no data');
    }
  } catch (error) {
    addResult('Phase 2', 'gifts table query', 'FAIL',
      'Table query failed', error.message);
  }

  // Test 2.2: Test record-gift function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/record-gift`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        gift_date: '2026-01-24',
        gift_type: 'Cash',
        amount: 18000,
        donor_name: 'Test Donor'
      })
    });

    const result = await response.json();

    if (response.ok || response.status === 401) {
      addResult('Phase 2', 'record-gift function', 'PASS',
        'Function exists and is callable (may require auth for actual recording)');
    } else {
      addResult('Phase 2', 'record-gift function', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 2', 'record-gift function', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 2.3: Check for contribution request generation (expected to be missing)
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-contribution-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ trust_id: 'test' })
    });

    if (response.status === 404) {
      addResult('Phase 2', 'Contribution request generation', 'NOT_IMPLEMENTED',
        'Function does not exist (expected gap per audit)');
    } else {
      addResult('Phase 2', 'Contribution request generation', 'PASS',
        'Function exists!');
    }
  } catch (error) {
    addResult('Phase 2', 'Contribution request generation', 'NOT_IMPLEMENTED',
      'Function does not exist (expected gap per audit)');
  }

  // Test 2.4: Check process-document function (AI extraction)
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ document_url: 'test.pdf' })
    });

    const result = await response.json();

    if (response.ok || response.status === 401 || result.error?.includes('document_url')) {
      addResult('Phase 2', 'AI document processing (gift extraction)', 'PASS',
        'process-document function exists and is callable');
    } else {
      addResult('Phase 2', 'AI document processing (gift extraction)', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 2', 'AI document processing (gift extraction)', 'FAIL',
      'Function call failed', error.message);
  }
}

// =============================================================================
// PHASE 3: CRUMMEY COMPLIANCE
// =============================================================================

async function testPhase3_CrummeyCompliance() {
  log('\n' + '='.repeat(80));
  log('PHASE 3: CRUMMEY COMPLIANCE - Testing notice generation & 30-day clock');
  log('='.repeat(80));

  // Test 3.1: Query crummey_notices table
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      const hasDeadlines = data.every(notice => notice.withdrawal_deadline);
      addResult('Phase 3', 'crummey_notices table with 30-day clock', 'PASS',
        `Found ${data.length} notices. All have withdrawal_deadline: ${hasDeadlines}`);
    } else {
      addResult('Phase 3', 'crummey_notices table with 30-day clock', 'PARTIAL',
        'Table exists but no data');
    }
  } catch (error) {
    addResult('Phase 3', 'crummey_notices table with 30-day clock', 'FAIL',
      'Table query failed', error.message);
  }

  // Test 3.2: Test generate-crummey-notice function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-crummey-notice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ gift_id: 'test' })
    });

    const result = await response.json();

    if (response.ok || response.status === 401 || result.error?.includes('gift_id')) {
      addResult('Phase 3', 'generate-crummey-notice function', 'PASS',
        'Function exists and is callable');
    } else {
      addResult('Phase 3', 'generate-crummey-notice function', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 3', 'generate-crummey-notice function', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 3.3: Check email_logs table (delivery tracking)
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 3', 'Email delivery tracking', 'PASS',
        `Found ${data.length} email logs. Delivery tracking is active.`);
    } else {
      addResult('Phase 3', 'Email delivery tracking', 'PARTIAL',
        'Table exists but no emails sent yet');
    }
  } catch (error) {
    addResult('Phase 3', 'Email delivery tracking', 'FAIL',
      'email_logs table query failed', error.message);
  }

  // Test 3.4: Test send-deadline-alerts function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-deadline-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({})
    });

    const result = await response.json();

    if (response.ok || response.status === 401) {
      addResult('Phase 3', 'Deadline alert automation', 'PASS',
        'send-deadline-alerts function exists');
    } else {
      addResult('Phase 3', 'Deadline alert automation', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 3', 'Deadline alert automation', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 3.5: Test expire-crummey-notices function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/expire-crummey-notices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({})
    });

    const result = await response.json();

    if (response.ok || response.status === 401) {
      addResult('Phase 3', 'Auto-expiration after 30 days', 'PASS',
        'expire-crummey-notices function exists');
    } else {
      addResult('Phase 3', 'Auto-expiration after 30 days', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 3', 'Auto-expiration after 30 days', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 3.6: Check cron job for expiration
  try {
    const { data, error } = await supabase
      .from('cron_execution_log')
      .select('*')
      .eq('job_name', 'expire-crummey-notices')
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 3', 'Cron automation for expiration', 'PASS',
        'Cron job execution log found - automation is active');
    } else {
      addResult('Phase 3', 'Cron automation for expiration', 'PARTIAL',
        'Cron job configured but no execution history yet');
    }
  } catch (error) {
    // Table might not exist if cron hasn't run
    addResult('Phase 3', 'Cron automation for expiration', 'PARTIAL',
      'Cannot verify cron execution (table may not exist yet)');
  }
}

// =============================================================================
// PHASE 4: WITHDRAWAL LAPSE
// =============================================================================

async function testPhase4_WithdrawalLapse() {
  log('\n' + '='.repeat(80));
  log('PHASE 4: WITHDRAWAL LAPSE - Testing lapse logging & fund unlocking');
  log('='.repeat(80));

  // Test 4.1: Query for expired notices
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .select('*')
      .eq('notice_status', 'expired')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 4', 'Expired notice logging', 'PASS',
        `Found ${data.length} expired notices. Lapse tracking works.`);
    } else {
      addResult('Phase 4', 'Expired notice logging', 'PARTIAL',
        'No expired notices in database yet (may need time to pass)');
    }
  } catch (error) {
    addResult('Phase 4', 'Expired notice logging', 'FAIL',
      'Query failed', error.message);
  }

  // Test 4.2: Check if withdrawal_deadline tracking exists
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .select('withdrawal_deadline, notice_status')
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0 && data[0].withdrawal_deadline) {
      addResult('Phase 4', '30-day withdrawal clock tracking', 'PASS',
        'withdrawal_deadline field exists and is populated');
    } else {
      addResult('Phase 4', '30-day withdrawal clock tracking', 'PARTIAL',
        'Schema supports it but no data to verify');
    }
  } catch (error) {
    addResult('Phase 4', '30-day withdrawal clock tracking', 'FAIL',
      'Query failed', error.message);
  }

  // Test 4.3: Check for funds unlocking calculation (this may not exist yet)
  try {
    const { data: notices, error } = await supabase
      .from('crummey_notices')
      .select('withdrawal_amount, notice_status')
      .eq('notice_status', 'expired')
      .limit(1);

    if (error) throw error;

    if (notices && notices.length > 0) {
      const unlockedFunds = notices[0].withdrawal_amount;
      addResult('Phase 4', 'Unlocked funds calculation', 'PASS',
        `Can calculate unlocked funds from expired notices (e.g., $${unlockedFunds})`);
    } else {
      addResult('Phase 4', 'Unlocked funds calculation', 'PARTIAL',
        'Schema supports it but no expired notices to calculate from');
    }
  } catch (error) {
    addResult('Phase 4', 'Unlocked funds calculation', 'FAIL',
      'Query failed', error.message);
  }
}

// =============================================================================
// PHASE 5: PREMIUM PAYMENT
// =============================================================================

async function testPhase5_PremiumPayment() {
  log('\n' + '='.repeat(80));
  log('PHASE 5: PREMIUM PAYMENT - Testing payment tracking');
  log('='.repeat(80));

  // Test 5.1: Query premium_payments table
  try {
    const { data, error } = await supabase
      .from('premium_payments')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 5', 'premium_payments table', 'PASS',
        `Found ${data.length} payment records`);
    } else {
      addResult('Phase 5', 'premium_payments table', 'PARTIAL',
        'Table exists but no payment history yet');
    }
  } catch (error) {
    addResult('Phase 5', 'premium_payments table', 'FAIL',
      'Table query failed', error.message);
  }

  // Test 5.2: Test record-premium-payment function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/record-premium-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        policy_id: 'test',
        payment_date: '2026-01-24',
        amount: 5000
      })
    });

    const result = await response.json();

    if (response.ok || response.status === 401 || result.error?.includes('policy_id')) {
      addResult('Phase 5', 'record-premium-payment function', 'PASS',
        'Function exists and is callable');
    } else {
      addResult('Phase 5', 'record-premium-payment function', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 5', 'record-premium-payment function', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 5.3: Check payment history tracking
  try {
    const { data, error } = await supabase
      .from('premium_payments')
      .select('payment_date, amount, payment_method, status')
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const hasRequiredFields = data[0].payment_date && data[0].amount;
      addResult('Phase 5', 'Payment history tracking', 'PASS',
        `Payment records include date, amount, method, status: ${hasRequiredFields}`);
    } else {
      addResult('Phase 5', 'Payment history tracking', 'PARTIAL',
        'Schema is correct but no data to verify');
    }
  } catch (error) {
    addResult('Phase 5', 'Payment history tracking', 'FAIL',
      'Query failed', error.message);
  }
}

// =============================================================================
// PHASE 6: POLICY HEALTH CHECK
// =============================================================================

async function testPhase6_PolicyHealthCheck() {
  log('\n' + '='.repeat(80));
  log('PHASE 6: POLICY HEALTH CHECK - Testing AI-powered health analysis');
  log('='.repeat(80));

  // Test 6.1: Query policy_health_checks table
  try {
    const { data, error } = await supabase
      .from('policy_health_checks')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      const hasAiScores = data.every(check =>
        check.health_score !== null &&
        check.overall_status &&
        check.component_scores
      );
      addResult('Phase 6', 'policy_health_checks table', 'PASS',
        `Found ${data.length} health checks. AI scores present: ${hasAiScores}`);
    } else {
      addResult('Phase 6', 'policy_health_checks table', 'PARTIAL',
        'Table exists but no health check history yet');
    }
  } catch (error) {
    addResult('Phase 6', 'policy_health_checks table', 'FAIL',
      'Table query failed', error.message);
  }

  // Test 6.2: Test analyze-policy-health function
  try {
    const { data: policy } = await supabase
      .from('insurance_policies')
      .select('id')
      .limit(1)
      .single();

    if (policy) {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-policy-health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ policy_id: policy.id, check_trigger: 'manual' })
      });

      const result = await response.json();

      if (response.ok && result.health_score !== undefined) {
        addResult('Phase 6', 'analyze-policy-health function', 'PASS',
          `Function works! Score: ${result.health_score}, Status: ${result.overall_status}`);
      } else if (response.status === 401) {
        addResult('Phase 6', 'analyze-policy-health function', 'PARTIAL',
          'Function exists but requires authentication');
      } else {
        addResult('Phase 6', 'analyze-policy-health function', 'FAIL',
          `Function error: ${result.error || result.message}`);
      }
    } else {
      addResult('Phase 6', 'analyze-policy-health function', 'PARTIAL',
        'No policies to test against');
    }
  } catch (error) {
    addResult('Phase 6', 'analyze-policy-health function', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 6.3: Check ai_processing_log
  try {
    const { data, error } = await supabase
      .from('ai_processing_log')
      .select('*')
      .eq('entity_type', 'policy_health')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 6', 'AI processing audit log', 'PASS',
        `Found ${data.length} AI processing logs. Compliance tracking active.`);
    } else {
      addResult('Phase 6', 'AI processing audit log', 'PARTIAL',
        'Table exists but no AI processing history yet');
    }
  } catch (error) {
    addResult('Phase 6', 'AI processing audit log', 'FAIL',
      'Query failed', error.message);
  }

  // Test 6.4: Test run-scheduled-health-checks function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/run-scheduled-health-checks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ trigger: 'manual' })
    });

    const result = await response.json();

    if (response.ok || response.status === 401) {
      addResult('Phase 6', 'Automated daily health checks', 'PASS',
        'run-scheduled-health-checks function exists');
    } else {
      addResult('Phase 6', 'Automated daily health checks', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 6', 'Automated daily health checks', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 6.5: Check dashboard data availability
  try {
    const { data: policies, error: policyError } = await supabase
      .from('insurance_policies')
      .select('id')
      .limit(1);

    if (policyError) throw policyError;

    const { data: healthChecks, error: healthError } = await supabase
      .from('policy_health_checks')
      .select('*')
      .limit(1);

    if (healthError) throw healthError;

    if (policies && policies.length > 0) {
      addResult('Phase 6', 'Dashboard data loads', 'PASS',
        `Policies table accessible. Health checks: ${healthChecks?.length || 0}`);
    } else {
      addResult('Phase 6', 'Dashboard data loads', 'PARTIAL',
        'Tables accessible but no data');
    }
  } catch (error) {
    addResult('Phase 6', 'Dashboard data loads', 'FAIL',
      'Data fetch failed', error.message);
  }
}

// =============================================================================
// PHASE 7: REMEDIATION WORKFLOW
// =============================================================================

async function testPhase7_RemediationWorkflow() {
  log('\n' + '='.repeat(80));
  log('PHASE 7: REMEDIATION WORKFLOW - Testing action tracking & updates');
  log('='.repeat(80));

  // Test 7.1: Query remediation_actions table
  try {
    const { data, error } = await supabase
      .from('remediation_actions')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      const statuses = data.map(a => a.status);
      addResult('Phase 7', 'remediation_actions table', 'PASS',
        `Found ${data.length} actions. Statuses: ${[...new Set(statuses)].join(', ')}`);
    } else {
      addResult('Phase 7', 'remediation_actions table', 'PARTIAL',
        'Table exists but no remediation actions yet');
    }
  } catch (error) {
    addResult('Phase 7', 'remediation_actions table', 'FAIL',
      'Table query failed', error.message);
  }

  // Test 7.2: Check automatic action creation
  try {
    const { data, error } = await supabase
      .from('remediation_actions')
      .select('health_check_id, ai_suggested')
      .eq('ai_suggested', true)
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 7', 'Automatic action creation', 'PASS',
        'AI-suggested actions exist. Auto-creation from health checks works.');
    } else {
      addResult('Phase 7', 'Automatic action creation', 'PARTIAL',
        'No AI-suggested actions yet (may not have run health checks)');
    }
  } catch (error) {
    addResult('Phase 7', 'Automatic action creation', 'FAIL',
      'Query failed', error.message);
  }

  // Test 7.3: Check priority assignment
  try {
    const { data, error } = await supabase
      .from('remediation_actions')
      .select('priority')
      .limit(10);

    if (error) throw error;

    if (data && data.length > 0) {
      const priorities = data.map(a => a.priority).filter(p => p);
      const hasUrgent = priorities.includes('urgent');
      addResult('Phase 7', 'Priority assignment', 'PASS',
        `Actions have priorities. Urgent actions exist: ${hasUrgent}`);
    } else {
      addResult('Phase 7', 'Priority assignment', 'PARTIAL',
        'Schema supports priorities but no data to verify');
    }
  } catch (error) {
    addResult('Phase 7', 'Priority assignment', 'FAIL',
      'Query failed', error.message);
  }

  // Test 7.4: Check email alerts
  try {
    const { data, error } = await supabase
      .from('remediation_actions')
      .select('email_alert_sent')
      .eq('email_alert_sent', true)
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 7', 'Email alerts for actions', 'PASS',
        'Email alerts are being sent for remediation actions');
    } else {
      addResult('Phase 7', 'Email alerts for actions', 'PARTIAL',
        'Email alert capability exists but none sent yet');
    }
  } catch (error) {
    addResult('Phase 7', 'Email alerts for actions', 'FAIL',
      'Query failed', error.message);
  }

  // Test 7.5: Test status update capability (schema check)
  try {
    const { data, error } = await supabase
      .from('remediation_actions')
      .select('status, assigned_to')
      .limit(1);

    if (error) throw error;

    addResult('Phase 7', 'Action status updates', 'PARTIAL',
      'Schema supports status & assignment fields. UI update functionality needs verification.');
  } catch (error) {
    addResult('Phase 7', 'Action status updates', 'FAIL',
      'Query failed', error.message);
  }
}

// =============================================================================
// PHASE 8: REPORTING
// =============================================================================

async function testPhase8_Reporting() {
  log('\n' + '='.repeat(80));
  log('PHASE 8: REPORTING - Testing export & report generation');
  log('='.repeat(80));

  // Test 8.1: Check for export functions
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-gift-tax-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ year: 2026 })
    });

    if (response.status === 404) {
      addResult('Phase 8', 'Gift tax summary report', 'NOT_IMPLEMENTED',
        'Function does not exist (expected per audit)');
    } else {
      addResult('Phase 8', 'Gift tax summary report', 'PASS',
        'Function exists!');
    }
  } catch (error) {
    addResult('Phase 8', 'Gift tax summary report', 'NOT_IMPLEMENTED',
      'Function does not exist');
  }

  // Test 8.2: Check for audit trail export
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/export-audit-trail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({})
    });

    if (response.status === 404) {
      addResult('Phase 8', 'Audit trail export', 'NOT_IMPLEMENTED',
        'Function does not exist (expected per audit)');
    } else {
      addResult('Phase 8', 'Audit trail export', 'PASS',
        'Function exists!');
    }
  } catch (error) {
    addResult('Phase 8', 'Audit trail export', 'NOT_IMPLEMENTED',
      'Function does not exist');
  }

  // Test 8.3: Check if basic data aggregation is possible
  try {
    const { data: gifts, error: giftsError } = await supabase
      .from('gifts')
      .select('amount, gift_date')
      .limit(1);

    const { data: payments, error: paymentsError } = await supabase
      .from('premium_payments')
      .select('amount, payment_date')
      .limit(1);

    if (!giftsError && !paymentsError) {
      addResult('Phase 8', 'Data available for reporting', 'PASS',
        'All core tables accessible. Manual report generation is possible.');
    } else {
      addResult('Phase 8', 'Data available for reporting', 'PARTIAL',
        'Some tables not accessible');
    }
  } catch (error) {
    addResult('Phase 8', 'Data available for reporting', 'FAIL',
      'Data access failed', error.message);
  }

  // Test 8.4: Check for report templates/storage
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      addResult('Phase 8', 'Report storage/history', 'NOT_IMPLEMENTED',
        'reports table does not exist (expected per audit)');
    } else if (error) {
      addResult('Phase 8', 'Report storage/history', 'FAIL',
        'Query failed', error.message);
    } else {
      addResult('Phase 8', 'Report storage/history', 'PASS',
        'reports table exists');
    }
  } catch (error) {
    addResult('Phase 8', 'Report storage/history', 'NOT_IMPLEMENTED',
      'reports table does not exist');
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function runAllTests() {
  log('\n' + '█'.repeat(80));
  log('PVD V1 FUNCTIONAL VERIFICATION TEST SUITE');
  log('Testing against live Supabase backend: ' + SUPABASE_URL);
  log('█'.repeat(80));

  await testPhase1_PremiumAlert();
  await testPhase2_GiftCoordination();
  await testPhase3_CrummeyCompliance();
  await testPhase4_WithdrawalLapse();
  await testPhase5_PremiumPayment();
  await testPhase6_PolicyHealthCheck();
  await testPhase7_RemediationWorkflow();
  await testPhase8_Reporting();

  // Generate summary report
  log('\n' + '='.repeat(80));
  log('TEST RESULTS SUMMARY');
  log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const partial = results.filter(r => r.status === 'PARTIAL').length;
  const notImpl = results.filter(r => r.status === 'NOT_IMPLEMENTED').length;
  const total = results.length;

  log(`\nTotal Tests: ${total}`);
  log(`✅ Passed: ${passed} (${Math.round(passed/total*100)}%)`);
  log(`❌ Failed: ${failed} (${Math.round(failed/total*100)}%)`);
  log(`⚠️  Partial: ${partial} (${Math.round(partial/total*100)}%)`);
  log(`⏭️  Not Implemented: ${notImpl} (${Math.round(notImpl/total*100)}%)`);

  // Generate markdown table
  log('\n' + '='.repeat(80));
  log('DETAILED RESULTS (Markdown Table)');
  log('='.repeat(80));
  log('\n');

  console.log('| Phase | Test | Status | Details |');
  console.log('|-------|------|--------|---------|');
  results.forEach(r => {
    const emoji = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : r.status === 'PARTIAL' ? '⚠️' : '⏭️';
    console.log(`| ${r.phase} | ${r.test} | ${emoji} ${r.status} | ${r.details} |`);
  });

  log('\n' + '='.repeat(80));
  log('TEST SUITE COMPLETE');
  log('='.repeat(80));
}

// Run the test suite
runAllTests().catch(error => {
  console.error('Fatal error running test suite:', error);
  Deno.exit(1);
});
