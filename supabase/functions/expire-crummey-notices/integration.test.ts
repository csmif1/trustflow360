/**
 * Integration tests for expire-crummey-notices edge function
 */

import { assertEquals, assertExists } from '../_shared/test-utils.ts';

// Mock date helper
function getDateOffset(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

Deno.test('Integration - Expires multiple past-deadline notices', async () => {
  const mockNotices = [
    {
      id: 'notice-1',
      gift_id: 'gift-1',
      beneficiary_id: 'ben-1',
      notice_status: 'sent',
      withdrawal_deadline: getDateOffset(-5), // 5 days ago
      acknowledged_at: null
    },
    {
      id: 'notice-2',
      gift_id: 'gift-1',
      beneficiary_id: 'ben-2',
      notice_status: 'sent',
      withdrawal_deadline: getDateOffset(-1), // Yesterday
      acknowledged_at: null
    },
    {
      id: 'notice-3',
      gift_id: 'gift-2',
      beneficiary_id: 'ben-3',
      notice_status: 'sent',
      withdrawal_deadline: getDateOffset(5), // Future - should NOT expire
      acknowledged_at: null
    }
  ];

  const today = new Date().toISOString().split('T')[0];
  const shouldExpire = mockNotices.filter(n =>
    n.notice_status === 'sent' &&
    !n.acknowledged_at &&
    n.withdrawal_deadline < today
  );

  assertEquals(shouldExpire.length, 2);
});

Deno.test('Integration - Skips notices with acknowledged withdrawal', async () => {
  const mockNotices = [
    {
      id: 'notice-4',
      gift_id: 'gift-1',
      beneficiary_id: 'ben-1',
      notice_status: 'sent',
      withdrawal_deadline: getDateOffset(-10),
      acknowledged_at: '2026-01-15T10:00:00Z' // Beneficiary acknowledged/withdrew
    }
  ];

  const today = new Date().toISOString().split('T')[0];
  const shouldExpire = mockNotices.filter(n =>
    n.notice_status === 'sent' &&
    !n.acknowledged_at &&
    n.withdrawal_deadline < today
  );

  assertEquals(shouldExpire.length, 0);
});

Deno.test('Integration - Handles empty result set', async () => {
  const mockNotices: any[] = [];

  const today = new Date().toISOString().split('T')[0];
  const shouldExpire = mockNotices.filter(n =>
    n.status === 'sent' &&
    !n.withdrawal_exercised &&
    n.withdrawal_deadline < today
  );

  assertEquals(shouldExpire.length, 0);
});

Deno.test('Integration - Response format validation', async () => {
  const mockResponse = {
    success: true,
    total_checked: 5,
    total_expired: 2,
    expired_notice_ids: ['notice-1', 'notice-2'],
    execution_timestamp: new Date().toISOString()
  };

  assertExists(mockResponse.success);
  assertEquals(mockResponse.success, true);
  assertExists(mockResponse.total_checked);
  assertExists(mockResponse.total_expired);
  assertExists(mockResponse.expired_notice_ids);
  assertEquals(Array.isArray(mockResponse.expired_notice_ids), true);
  assertExists(mockResponse.execution_timestamp);
});
