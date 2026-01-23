/**
 * PVD V1 Functional Verification Tests
 * Tests each phase against live Supabase backend
 *
 * Run with: node tests/pvd-v1-verification.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQyMzksImV4cCI6MjA1MjU1MDIzOX0.gHOAXzJhYgvh7TPlQN2lkLq7xQZp-24EPhqRW2xqVrY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const results = [];

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function addResult(phase, test, status, details, error) {
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
        `Found ${data.length} records`);
    } else {
      addResult('Phase 1', 'upcoming_premiums table query', 'PARTIAL',
        'Table exists but no data');
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
      addResult('Phase 1', 'check-premium-reminders (90-day)', 'PASS',
        `Found ${result.upcoming_premiums.length} premiums in 90-day window`);
    } else if (response.status === 401) {
      addResult('Phase 1', 'check-premium-reminders (90-day)', 'PARTIAL',
        'Function exists but requires auth');
    } else {
      addResult('Phase 1', 'check-premium-reminders (90-day)', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 1', 'check-premium-reminders (90-day)', 'FAIL',
      'Function call failed', error.message);
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
        trust_id: 'test',
        gift_date: new Date().toISOString().split('T')[0],
        amount: 1000
      })
    });

    if (response.status === 401) {
      addResult('Phase 2', 'record-gift function', 'PARTIAL',
        'Function exists but requires auth');
    } else if (response.ok) {
      addResult('Phase 2', 'record-gift function', 'PASS',
        'Function accessible and responding');
    } else {
      const result = await response.json();
      addResult('Phase 2', 'record-gift function', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 2', 'record-gift function', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 2.3: Check for gift request generator (missing feature)
  addResult('Phase 2', 'gift request generator', 'NOT_IMPLEMENTED',
    'Feature identified as gap in audit');
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
      addResult('Phase 3', 'crummey_notices table query', 'PASS',
        `Found ${data.length} notice records`);
    } else {
      addResult('Phase 3', 'crummey_notices table query', 'PARTIAL',
        'Table exists but no data');
    }
  } catch (error) {
    addResult('Phase 3', 'crummey_notices table query', 'FAIL',
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

    if (response.status === 401) {
      addResult('Phase 3', 'generate-crummey-notice function', 'PARTIAL',
        'Function exists but requires auth');
    } else if (response.ok) {
      addResult('Phase 3', 'generate-crummey-notice function', 'PASS',
        'Function accessible and responding');
    } else {
      const result = await response.json();
      addResult('Phase 3', 'generate-crummey-notice function', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 3', 'generate-crummey-notice function', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 3.3: Test send-deadline-alerts function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-deadline-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.status === 401) {
      addResult('Phase 3', 'send-deadline-alerts function', 'PARTIAL',
        'Function exists but requires auth');
    } else if (response.ok) {
      addResult('Phase 3', 'send-deadline-alerts function', 'PASS',
        'Function accessible and responding');
    } else {
      addResult('Phase 3', 'send-deadline-alerts function', 'FAIL',
        'Function error or not found');
    }
  } catch (error) {
    addResult('Phase 3', 'send-deadline-alerts function', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 3.4: Check email_logs table
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 3', 'email_logs table query', 'PASS',
        `Found ${data.length} email log records`);
    } else {
      addResult('Phase 3', 'email_logs table query', 'PARTIAL',
        'Table exists but no data');
    }
  } catch (error) {
    addResult('Phase 3', 'email_logs table query', 'FAIL',
      'Table query failed', error.message);
  }
}

// =============================================================================
// PHASE 4: WITHDRAWAL LAPSE PREVENTION
// =============================================================================

async function testPhase4_WithdrawalLapse() {
  log('\n' + '='.repeat(80));
  log('PHASE 4: WITHDRAWAL LAPSE - Testing expired notice tracking');
  log('='.repeat(80));

  // Test 4.1: Test expire-crummey-notices function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/expire-crummey-notices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.status === 401) {
      addResult('Phase 4', 'expire-crummey-notices function', 'PARTIAL',
        'Function exists but requires auth');
    } else if (response.ok) {
      addResult('Phase 4', 'expire-crummey-notices function', 'PASS',
        'Function accessible and responding');
    } else {
      addResult('Phase 4', 'expire-crummey-notices function', 'FAIL',
        'Function error or not found');
    }
  } catch (error) {
    addResult('Phase 4', 'expire-crummey-notices function', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 4.2: Query expired notices
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .select('*')
      .eq('status', 'expired')
      .limit(5);

    if (error) throw error;

    addResult('Phase 4', 'expired notices query', 'PASS',
      data && data.length > 0 ? `Found ${data.length} expired notices` : 'No expired notices found');
  } catch (error) {
    addResult('Phase 4', 'expired notices query', 'FAIL',
      'Query failed', error.message);
  }
}

// =============================================================================
// PHASE 5: PREMIUM PAYMENT TRACKING
// =============================================================================

async function testPhase5_PremiumPayment() {
  log('\n' + '='.repeat(80));
  log('PHASE 5: PREMIUM PAYMENT - Testing payment recording');
  log('='.repeat(80));

  // Test 5.1: Query premium_payments table
  try {
    const { data, error } = await supabase
      .from('premium_payments')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 5', 'premium_payments table query', 'PASS',
        `Found ${data.length} payment records`);
    } else {
      addResult('Phase 5', 'premium_payments table query', 'PARTIAL',
        'Table exists but no data');
    }
  } catch (error) {
    addResult('Phase 5', 'premium_payments table query', 'FAIL',
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
        payment_date: new Date().toISOString().split('T')[0],
        amount: 5000
      })
    });

    if (response.status === 401) {
      addResult('Phase 5', 'record-premium-payment function', 'PARTIAL',
        'Function exists but requires auth');
    } else if (response.ok) {
      addResult('Phase 5', 'record-premium-payment function', 'PASS',
        'Function accessible and responding');
    } else {
      const result = await response.json();
      addResult('Phase 5', 'record-premium-payment function', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 5', 'record-premium-payment function', 'FAIL',
      'Function call failed', error.message);
  }
}

// =============================================================================
// PHASE 6: POLICY HEALTH CHECK
// =============================================================================

async function testPhase6_PolicyHealthCheck() {
  log('\n' + '='.repeat(80));
  log('PHASE 6: POLICY HEALTH CHECK - Testing AI analysis & monitoring');
  log('='.repeat(80));

  // Test 6.1: Query policy_health_checks table
  try {
    const { data, error } = await supabase
      .from('policy_health_checks')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 6', 'policy_health_checks table query', 'PASS',
        `Found ${data.length} health check records`);
    } else {
      addResult('Phase 6', 'policy_health_checks table query', 'PARTIAL',
        'Table exists but no data');
    }
  } catch (error) {
    addResult('Phase 6', 'policy_health_checks table query', 'FAIL',
      'Table query failed', error.message);
  }

  // Test 6.2: Test analyze-policy-health function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-policy-health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ policy_id: 'test' })
    });

    if (response.status === 401) {
      addResult('Phase 6', 'analyze-policy-health function', 'PARTIAL',
        'Function exists but requires auth');
    } else if (response.ok) {
      addResult('Phase 6', 'analyze-policy-health function', 'PASS',
        'Function accessible and responding');
    } else {
      const result = await response.json();
      addResult('Phase 6', 'analyze-policy-health function', 'FAIL',
        `Function error: ${result.error || result.message}`);
    }
  } catch (error) {
    addResult('Phase 6', 'analyze-policy-health function', 'FAIL',
      'Function call failed', error.message);
  }

  // Test 6.3: Test run-scheduled-health-checks function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/run-scheduled-health-checks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.status === 401) {
      addResult('Phase 6', 'run-scheduled-health-checks function', 'PARTIAL',
        'Function exists but requires auth');
    } else if (response.ok) {
      addResult('Phase 6', 'run-scheduled-health-checks function', 'PASS',
        'Function accessible and responding');
    } else {
      addResult('Phase 6', 'run-scheduled-health-checks function', 'FAIL',
        'Function error or not found');
    }
  } catch (error) {
    addResult('Phase 6', 'run-scheduled-health-checks function', 'FAIL',
      'Function call failed', error.message);
  }
}

// =============================================================================
// PHASE 7: REMEDIATION WORKFLOW
// =============================================================================

async function testPhase7_RemediationWorkflow() {
  log('\n' + '='.repeat(80));
  log('PHASE 7: REMEDIATION WORKFLOW - Testing action tracking');
  log('='.repeat(80));

  // Test 7.1: Query remediation_actions table
  try {
    const { data, error } = await supabase
      .from('remediation_actions')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 7', 'remediation_actions table query', 'PASS',
        `Found ${data.length} remediation action records`);
    } else {
      addResult('Phase 7', 'remediation_actions table query', 'PARTIAL',
        'Table exists but no data');
    }
  } catch (error) {
    addResult('Phase 7', 'remediation_actions table query', 'FAIL',
      'Table query failed', error.message);
  }

  // Test 7.2: Check for action completion workflow (missing feature)
  addResult('Phase 7', 'action completion workflow', 'NOT_IMPLEMENTED',
    'Feature identified as gap in audit (40% incomplete)');

  // Test 7.3: Check for action assignment feature (missing)
  addResult('Phase 7', 'action assignment feature', 'NOT_IMPLEMENTED',
    'Feature identified as gap in audit');
}

// =============================================================================
// PHASE 8: REPORTING & ANALYTICS
// =============================================================================

async function testPhase8_Reporting() {
  log('\n' + '='.repeat(80));
  log('PHASE 8: REPORTING - Testing export & summary reports');
  log('='.repeat(80));

  // Test 8.1: Check for premium payment summary (missing)
  addResult('Phase 8', 'premium payment summary report', 'NOT_IMPLEMENTED',
    'Feature identified as gap in audit');

  // Test 8.2: Check for gift tax summary (missing)
  addResult('Phase 8', 'gift tax summary report', 'NOT_IMPLEMENTED',
    'Feature identified as gap in audit (large effort)');

  // Test 8.3: Check for audit trail export (missing)
  addResult('Phase 8', 'audit trail export', 'NOT_IMPLEMENTED',
    'Feature identified as gap in audit');

  // Test 8.4: Query ai_processing_log for audit trail data
  try {
    const { data, error } = await supabase
      .from('ai_processing_log')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult('Phase 8', 'ai_processing_log table query', 'PASS',
        `Found ${data.length} audit log records`);
    } else {
      addResult('Phase 8', 'ai_processing_log table query', 'PARTIAL',
        'Table exists but no data');
    }
  } catch (error) {
    addResult('Phase 8', 'ai_processing_log table query', 'FAIL',
      'Table query failed', error.message);
  }
}

// Run all tests
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

  // Summary
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
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
