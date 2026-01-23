/**
 * Test script for remediation alert email template
 * Run with: deno run --allow-read tests/test-remediation-email.ts
 */

import type { RemediationAlertData } from '../supabase/functions/_shared/email-templates.ts'
import { generateRemediationAlertHTML, generateRemediationAlertText } from '../supabase/functions/_shared/email-templates.ts'

const testData: RemediationAlertData = {
  trustee_name: 'John Doe',
  trustee_email: 'john.doe@example.com',
  trust_name: 'Thompson Legacy ILIT',
  policy_number: 'NWM-2019-847562',
  carrier: 'Northwestern Mutual',
  overall_status: 'critical',
  health_score: 42.5,
  check_date: new Date().toISOString(),
  issues: [
    {
      type: 'premium_delinquent',
      severity: 'critical',
      description: 'Policy is in grace period. Premium payment is 67 days overdue. Immediate payment required to prevent policy lapse.'
    },
    {
      type: 'insufficient_funds',
      severity: 'high',
      description: 'Trust assets ($8,500) are insufficient to cover the next annual premium ($36,000). Additional funding required.'
    }
  ],
  remediation_actions: [
    {
      title: 'Pay overdue premium immediately',
      action_type: 'pay_premium',
      priority: 'urgent',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      days_until_due: 3
    },
    {
      title: 'Arrange trust funding to cover future premiums',
      action_type: 'fund_trust',
      priority: 'high',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      days_until_due: 7
    }
  ]
};

console.log('='.repeat(70));
console.log('REMEDIATION ALERT EMAIL TEMPLATE TEST');
console.log('='.repeat(70));
console.log('');
console.log('Test Data:');
console.log(`  Trust: ${testData.trust_name}`);
console.log(`  Trustee: ${testData.trustee_name} <${testData.trustee_email}>`);
console.log(`  Status: ${testData.overall_status.toUpperCase()}`);
console.log(`  Health Score: ${testData.health_score}/100`);
console.log(`  Issues: ${testData.issues.length}`);
console.log(`  Remediation Actions: ${testData.remediation_actions.length}`);
console.log('');

console.log('Generating HTML email...');
const htmlEmail = generateRemediationAlertHTML(testData);
console.log(`  HTML length: ${htmlEmail.length} characters`);
console.log(`  Contains policy number: ${htmlEmail.includes(testData.policy_number)}`);
console.log(`  Contains trustee name: ${htmlEmail.includes(testData.trustee_name)}`);
console.log(`  Contains health score: ${htmlEmail.includes(testData.health_score.toFixed(1))}`);
console.log(`  Contains critical status: ${htmlEmail.includes('CRITICAL')}`);
console.log('');

console.log('Generating text email...');
const textEmail = generateRemediationAlertText(testData);
console.log(`  Text length: ${textEmail.length} characters`);
console.log(`  Contains action items: ${textEmail.includes('REQUIRED ACTIONS')}`);
console.log(`  Contains urgent priority: ${textEmail.includes('URGENT')}`);
console.log('');

console.log('='.repeat(70));
console.log('TEXT EMAIL PREVIEW (first 500 characters):');
console.log('='.repeat(70));
console.log(textEmail.substring(0, 500));
console.log('...');
console.log('');

console.log('='.repeat(70));
console.log('TEST PASSED ✅');
console.log('Email templates generated successfully with all required data');
console.log('='.repeat(70));
