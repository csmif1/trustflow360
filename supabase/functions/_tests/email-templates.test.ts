/**
 * Tests for email template system
 */

import {
  generateCrummeyNoticeHTML,
  generateCrummeyNoticeText,
  generateDeadlineAlertHTML,
  generateDeadlineAlertText,
  generatePremiumReminderHTML,
  generatePremiumReminderText,
  type CrummeyNoticeData,
  type DeadlineAlertData,
  type PremiumReminderData
} from '../_shared/email-templates.ts';
import { assertExists, assertEquals } from '../_shared/test-utils.ts';

// Test data
const crummeyData: CrummeyNoticeData = {
  beneficiary_name: 'Jane Doe',
  trust_name: 'Smith Family ILIT',
  withdrawal_amount: 15000,
  notice_date: '2026-01-15',
  withdrawal_deadline: '2026-02-14',
  withdrawal_period_days: 30,
  trustee_name: 'John Smith',
  trustee_email: 'john.smith@example.com'
};

const alertData: DeadlineAlertData = {
  trustee_name: 'John Smith',
  beneficiary_name: 'Jane Doe',
  trust_name: 'Smith Family ILIT',
  withdrawal_amount: 15000,
  withdrawal_deadline: '2026-02-14',
  days_remaining: 5,
  notice_sent_date: '2026-01-15'
};

const premiumData: PremiumReminderData = {
  trustee_name: 'John Smith',
  trust_name: 'Smith Family ILIT',
  policy_number: 'POL-123456',
  carrier: 'State Farm Life',
  premium_amount: 12000,
  due_date: '2026-03-01',
  days_until_due: 30,
  available_funds: 50000,
  is_sufficient: true
};

Deno.test('Crummey Notice HTML - generates valid HTML', () => {
  const html = generateCrummeyNoticeHTML(crummeyData);

  assertExists(html);
  assertEquals(html.includes('<!DOCTYPE html>'), true);
  assertEquals(html.includes(crummeyData.beneficiary_name), true);
  assertEquals(html.includes(crummeyData.trust_name), true);
  assertEquals(html.includes('$15,000'), true);
});

Deno.test('Crummey Notice HTML - includes all required elements', () => {
  const html = generateCrummeyNoticeHTML(crummeyData);

  // Legal elements
  assertEquals(html.includes('Crummey Withdrawal Notice'), true);
  assertEquals(html.includes('withdrawal right'), true);
  assertEquals(html.includes('30 days'), true);
  assertEquals(html.includes('deadline'), true || html.includes('Deadline'), true);

  // Contact information
  assertEquals(html.includes(crummeyData.trustee_name!), true);
  assertEquals(html.includes(crummeyData.trustee_email!), true);
});

Deno.test('Crummey Notice HTML - is responsive', () => {
  const html = generateCrummeyNoticeHTML(crummeyData);

  assertEquals(html.includes('@media only screen'), true);
  assertEquals(html.includes('max-width: 600px'), true);
  assertEquals(html.includes('viewport'), true);
});

Deno.test('Crummey Notice Text - generates plain text version', () => {
  const text = generateCrummeyNoticeText(crummeyData);

  assertExists(text);
  assertEquals(text.includes(crummeyData.beneficiary_name), true);
  assertEquals(text.includes(crummeyData.trust_name), true);
  assertEquals(text.includes('$15,000'), true);
  assertEquals(text.includes('CRUMMEY WITHDRAWAL NOTICE'), true);
});

Deno.test('Crummey Notice Text - includes contact info when provided', () => {
  const text = generateCrummeyNoticeText(crummeyData);

  assertEquals(text.includes(crummeyData.trustee_name!), true);
  assertEquals(text.includes(crummeyData.trustee_email!), true);
});

Deno.test('Deadline Alert HTML - generates valid HTML with urgency', () => {
  const html = generateDeadlineAlertHTML(alertData);

  assertExists(html);
  assertEquals(html.includes('<!DOCTYPE html>'), true);
  assertEquals(html.includes(alertData.trustee_name), true);
  assertEquals(html.includes(alertData.beneficiary_name), true);
  assertEquals(html.includes('5 Day'), true);
});

Deno.test('Deadline Alert HTML - shows URGENT for 3 days or less', () => {
  const urgentData = { ...alertData, days_remaining: 2 };
  const html = generateDeadlineAlertHTML(urgentData);

  assertEquals(html.includes('URGENT'), true);
  assertEquals(html.includes('#dc3545'), true); // Red color
});

Deno.test('Deadline Alert HTML - shows Action Required for 4-7 days', () => {
  const actionData = { ...alertData, days_remaining: 5 };
  const html = generateDeadlineAlertHTML(actionData);

  assertEquals(html.includes('Action Required'), true);
  assertEquals(html.includes('#ffc107'), true); // Yellow color
});

Deno.test('Deadline Alert Text - generates plain text version', () => {
  const text = generateDeadlineAlertText(alertData);

  assertExists(text);
  assertEquals(text.includes(alertData.trustee_name), true);
  assertEquals(text.includes(alertData.beneficiary_name), true);
  assertEquals(text.includes('5 DAYS REMAINING'), true);
});

Deno.test('Premium Reminder HTML - generates valid HTML', () => {
  const html = generatePremiumReminderHTML(premiumData);

  assertExists(html);
  assertEquals(html.includes('<!DOCTYPE html>'), true);
  assertEquals(html.includes(premiumData.trustee_name), true);
  assertEquals(html.includes(premiumData.policy_number), true);
  assertEquals(html.includes('$12,000'), true);
});

Deno.test('Premium Reminder HTML - shows sufficient funds status', () => {
  const html = generatePremiumReminderHTML(premiumData);

  assertEquals(html.includes('Funds Available'), true);
  assertEquals(html.includes('#28a745'), true); // Green color
  assertEquals(html.includes('$50,000'), true);
});

Deno.test('Premium Reminder HTML - shows insufficient funds warning', () => {
  const insufficientData = { ...premiumData, available_funds: 5000, is_sufficient: false };
  const html = generatePremiumReminderHTML(insufficientData);

  assertEquals(html.includes('Insufficient Funds'), true);
  assertEquals(html.includes('Action Required: Additional Funding Needed'), true);
  assertEquals(html.includes('#dc3545'), true); // Red color
});

Deno.test('Premium Reminder Text - generates plain text version', () => {
  const text = generatePremiumReminderText(premiumData);

  assertExists(text);
  assertEquals(text.includes(premiumData.trustee_name), true);
  assertEquals(text.includes(premiumData.policy_number), true);
  assertEquals(text.includes('$12,000'), true);
  assertEquals(text.includes('FUNDS AVAILABLE'), true);
});

Deno.test('Premium Reminder Text - shows insufficient funds warning', () => {
  const insufficientData = { ...premiumData, available_funds: 5000, is_sufficient: false };
  const text = generatePremiumReminderText(insufficientData);

  assertEquals(text.includes('⚠️ INSUFFICIENT FUNDS'), true);
  assertEquals(text.includes('ACTION REQUIRED'), true);
});

Deno.test('All templates - handle special characters safely', () => {
  const specialData: CrummeyNoticeData = {
    ...crummeyData,
    beneficiary_name: "O'Brien & Associates",
    trust_name: 'Smith "Family" Trust <Test>'
  };

  const html = generateCrummeyNoticeHTML(specialData);
  const text = generateCrummeyNoticeText(specialData);

  assertExists(html);
  assertExists(text);
  assertEquals(html.includes("O'Brien"), true);
  assertEquals(text.includes("O'Brien"), true);
});
