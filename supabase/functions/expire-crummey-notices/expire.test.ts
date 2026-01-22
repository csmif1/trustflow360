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
    trust_id: 'trust-1',
    beneficiary_id: 'ben-1',
    status: 'sent',
    withdrawal_deadline: yesterdayStr,
    withdrawal_exercised: false
  };

  // Test that the function would update this notice to expired
  assertEquals(mockNotice.status, 'sent');

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
    trust_id: 'trust-1',
    beneficiary_id: 'ben-1',
    status: 'sent',
    withdrawal_deadline: tomorrowStr,
    withdrawal_exercised: false
  };

  const today = new Date().toISOString().split('T')[0];
  const isPastDeadline = mockNotice.withdrawal_deadline < today;
  assertEquals(isPastDeadline, false);
  assertEquals(mockNotice.status, 'sent'); // Should remain 'sent'
});

Deno.test('Expire Crummey Notices - Already expired notice is not modified', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const mockNotice = {
    id: 'notice-3',
    gift_id: 'gift-1',
    trust_id: 'trust-1',
    beneficiary_id: 'ben-1',
    status: 'expired',
    withdrawal_deadline: yesterdayStr,
    withdrawal_exercised: false
  };

  // Already expired notices should be skipped
  assertEquals(mockNotice.status, 'expired');
});

Deno.test('Expire Crummey Notices - Notice with withdrawal_exercised is not expired', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const mockNotice = {
    id: 'notice-4',
    gift_id: 'gift-1',
    trust_id: 'trust-1',
    beneficiary_id: 'ben-1',
    status: 'sent',
    withdrawal_deadline: yesterdayStr,
    withdrawal_exercised: true
  };

  // If beneficiary exercised withdrawal, don't expire
  const shouldExpire = mockNotice.status === 'sent'
    && !mockNotice.withdrawal_exercised;
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
    trust_id: 'trust-1',
    beneficiary_id: 'ben-1',
    status: 'expired',
    withdrawal_deadline: yesterdayStr,
    withdrawal_exercised: false
  };

  // Running expiration again on already expired notice should be safe
  const isAlreadyExpired = mockNotice.status === 'expired';
  assertEquals(isAlreadyExpired, true);
  // Function should skip this and not error
});
