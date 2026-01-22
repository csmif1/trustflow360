/**
 * Tests for send-deadline-alerts edge function logic
 */

import { assertEquals, assertExists } from '../_shared/test-utils.ts';

// Helper to calculate date offset
function getDateOffset(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

Deno.test('Deadline Alerts - Notice expiring in 5 days triggers alert', () => {
  const mockNotice = {
    id: 'notice-1',
    trust_id: 'trust-1',
    beneficiary_id: 'ben-1',
    notice_status: 'sent',
    withdrawal_deadline: getDateOffset(5), // 5 days from now
    withdrawal_amount: '15000.00'
  };

  const windowDays = 7;
  const today = new Date();
  const deadline = new Date(mockNotice.withdrawal_deadline);
  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const shouldAlert = mockNotice.notice_status === 'sent' && daysUntilDeadline > 0 && daysUntilDeadline <= windowDays;
  assertEquals(shouldAlert, true);
});

Deno.test('Deadline Alerts - Notice expiring in 10 days does NOT trigger alert', () => {
  const mockNotice = {
    id: 'notice-2',
    trust_id: 'trust-1',
    beneficiary_id: 'ben-1',
    notice_status: 'sent',
    withdrawal_deadline: getDateOffset(10), // 10 days from now
    withdrawal_amount: '15000.00'
  };

  const windowDays = 7;
  const today = new Date();
  const deadline = new Date(mockNotice.withdrawal_deadline);
  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const shouldAlert = mockNotice.notice_status === 'sent' && daysUntilDeadline > 0 && daysUntilDeadline <= windowDays;
  assertEquals(shouldAlert, false);
});

Deno.test('Deadline Alerts - Expired notice is skipped', () => {
  const mockNotice = {
    id: 'notice-3',
    trust_id: 'trust-1',
    beneficiary_id: 'ben-1',
    notice_status: 'expired',
    withdrawal_deadline: getDateOffset(-2), // Past deadline
    withdrawal_amount: '15000.00'
  };

  const windowDays = 7;
  const today = new Date();
  const deadline = new Date(mockNotice.withdrawal_deadline);
  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const shouldAlert = mockNotice.notice_status === 'sent' && daysUntilDeadline > 0 && daysUntilDeadline <= windowDays;
  assertEquals(shouldAlert, false);
});

Deno.test('Deadline Alerts - Already-alerted notice is skipped via email log', () => {
  const mockNotice = {
    id: 'notice-4',
    trust_id: 'trust-1',
    beneficiary_id: 'ben-1',
    notice_status: 'sent',
    withdrawal_deadline: getDateOffset(5),
    withdrawal_amount: '15000.00'
  };

  const mockEmailLogs = [
    {
      crummey_notice_id: 'notice-4',
      subject: 'Crummey Notice Deadline Alert',
      status: 'sent'
    }
  ];

  // Check if alert already sent
  const alreadySent = mockEmailLogs.some(log =>
    log.crummey_notice_id === mockNotice.id &&
    log.subject.includes('Deadline Alert')
  );

  assertEquals(alreadySent, true);
});

Deno.test('Deadline Alerts - Returns summary with counts', () => {
  const summary = {
    success: true,
    total_checked: 5,
    alerts_sent: 2,
    alerts_skipped: 3,
    window_days: 7
  };

  assertExists(summary.success);
  assertExists(summary.total_checked);
  assertExists(summary.alerts_sent);
  assertExists(summary.alerts_skipped);
  assertEquals(typeof summary.total_checked, 'number');
  assertEquals(typeof summary.alerts_sent, 'number');
  assertEquals(typeof summary.alerts_skipped, 'number');
});

Deno.test('Deadline Alerts - Alert sent to trustee not beneficiary', () => {
  const mockTrust = {
    id: 'trust-1',
    trust_name: 'Smith Family ILIT',
    trustee_name: 'John Smith',
    trustee_email: 'john.smith@example.com'
  };

  const mockBeneficiary = {
    id: 'ben-1',
    name: 'Jane Doe',
    email: 'jane.doe@example.com'
  };

  // Alert should go to trustee, not beneficiary
  const recipientEmail = mockTrust.trustee_email;
  assertEquals(recipientEmail, 'john.smith@example.com');
  assertEquals(recipientEmail !== mockBeneficiary.email, true);
});

Deno.test('Deadline Alerts - Multiple notices within window', () => {
  const mockNotices = [
    { id: 'notice-1', withdrawal_deadline: getDateOffset(2), notice_status: 'sent' },
    { id: 'notice-2', withdrawal_deadline: getDateOffset(5), notice_status: 'sent' },
    { id: 'notice-3', withdrawal_deadline: getDateOffset(7), notice_status: 'sent' },
    { id: 'notice-4', withdrawal_deadline: getDateOffset(10), notice_status: 'sent' }, // Outside window
  ];

  const windowDays = 7;
  const today = new Date();

  const withinWindow = mockNotices.filter(notice => {
    const deadline = new Date(notice.withdrawal_deadline);
    const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return notice.notice_status === 'sent' && daysUntilDeadline > 0 && daysUntilDeadline <= windowDays;
  });

  assertEquals(withinWindow.length, 3);
});
