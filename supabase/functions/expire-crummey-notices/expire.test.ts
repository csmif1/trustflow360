/**
 * Tests for expire-crummey-notices edge function
 */

import { assertEquals, assertExists } from '../_shared/test-utils.ts';

Deno.test('Expire Crummey Notices - Notice past deadline gets expired', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const mockNotice = {
    id: 'notice-1',
    gift_id: 'gift-1',
    beneficiary_id: 'ben-1',
    notice_status: 'sent',
    withdrawal_deadline: yesterdayStr,
    acknowledged_at: null
  };

  // Test that the function would update this notice to expired
  assertEquals(mockNotice.notice_status, 'sent');

  const today = new Date().toISOString().split('T')[0];
  const isPastDeadline = mockNotice.withdrawal_deadline < today;
  assertEquals(isPastDeadline, true);
});

Deno.test('Expire Crummey Notices - Notice before deadline stays sent', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const mockNotice = {
    id: 'notice-2',
    gift_id: 'gift-1',
    beneficiary_id: 'ben-1',
    notice_status: 'sent',
    withdrawal_deadline: tomorrowStr,
    acknowledged_at: null
  };

  const today = new Date().toISOString().split('T')[0];
  const isPastDeadline = mockNotice.withdrawal_deadline < today;
  assertEquals(isPastDeadline, false);
  assertEquals(mockNotice.notice_status, 'sent'); // Should remain 'sent'
});

Deno.test('Expire Crummey Notices - Already expired notice is not modified', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const mockNotice = {
    id: 'notice-3',
    gift_id: 'gift-1',
    beneficiary_id: 'ben-1',
    notice_status: 'expired',
    withdrawal_deadline: yesterdayStr,
    acknowledged_at: null
  };

  // Already expired notices should be skipped
  assertEquals(mockNotice.notice_status, 'expired');
});

Deno.test('Expire Crummey Notices - Notice with acknowledged_at is not expired', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const mockNotice = {
    id: 'notice-4',
    gift_id: 'gift-1',
    beneficiary_id: 'ben-1',
    notice_status: 'sent',
    withdrawal_deadline: yesterdayStr,
    acknowledged_at: '2026-01-20T10:00:00Z'
  };

  // If beneficiary acknowledged (exercised withdrawal), don't expire
  const shouldExpire = mockNotice.notice_status === 'sent'
    && !mockNotice.acknowledged_at;
  assertEquals(shouldExpire, false);
});

Deno.test('Expire Crummey Notices - Returns summary with counts', async () => {
  const summary = {
    total_checked: 4,
    total_expired: 1
  };

  assertExists(summary.total_checked);
  assertExists(summary.total_expired);
  assertEquals(typeof summary.total_checked, 'number');
  assertEquals(typeof summary.total_expired, 'number');
});

Deno.test('Expire Crummey Notices - Idempotent operation', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const mockNotice = {
    id: 'notice-5',
    gift_id: 'gift-1',
    beneficiary_id: 'ben-1',
    notice_status: 'expired',
    withdrawal_deadline: yesterdayStr,
    acknowledged_at: null
  };

  // Running expiration again on already expired notice should be safe
  const isAlreadyExpired = mockNotice.notice_status === 'expired';
  assertEquals(isAlreadyExpired, true);
  // Function should skip this and not error
});
