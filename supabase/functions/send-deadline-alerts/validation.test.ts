/**
 * Unit tests for send-deadline-alerts validation logic
 */

import { assertEquals } from '../_shared/test-utils.ts';

// Extract validation function for testing
function validateAlertInput(body: any): { valid: boolean; error?: string; data?: { window_days: number } } {
  // Check if window_days is provided
  if (body.window_days !== undefined && body.window_days !== null) {
    if (typeof body.window_days !== 'number' || body.window_days <= 0) {
      return { valid: false, error: 'window_days must be a positive number' };
    }
  }

  const windowDays = body.window_days ?? 7; // Default 7 days

  return { valid: true, data: { window_days: windowDays } };
}

Deno.test('Alert Validation - Negative window_days returns error', () => {
  const result = validateAlertInput({ window_days: -5 });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'window_days must be a positive number');
});

Deno.test('Alert Validation - Zero window_days returns error', () => {
  const result = validateAlertInput({ window_days: 0 });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'window_days must be a positive number');
});

Deno.test('Alert Validation - Valid custom window_days passes', () => {
  const result = validateAlertInput({ window_days: 14 });

  assertEquals(result.valid, true);
  assertEquals(result.data?.window_days, 14);
});

Deno.test('Alert Validation - No parameters uses default 7 days', () => {
  const result = validateAlertInput({});

  assertEquals(result.valid, true);
  assertEquals(result.data?.window_days, 7);
});

Deno.test('Alert Validation - String window_days returns error', () => {
  const result = validateAlertInput({ window_days: "7" });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'window_days must be a positive number');
});
