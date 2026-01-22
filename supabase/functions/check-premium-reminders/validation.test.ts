/**
 * Unit tests for check-premium-reminders validation logic
 */

import { assertEquals } from '../_shared/test-utils.ts';

// Extract validation function for testing
function validateReminderInput(body: any): { valid: boolean; error?: string } {
  // Optional window_days parameter
  if (body.window_days !== undefined && body.window_days !== null) {
    if (typeof body.window_days !== 'number' || body.window_days < 1) {
      return { valid: false, error: 'window_days must be a positive number' };
    }
  }

  return { valid: true };
}

Deno.test('Reminder Validation - Negative window_days returns error', () => {
  const result = validateReminderInput({
    window_days: -30
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'window_days must be a positive number');
});

Deno.test('Reminder Validation - Zero window_days returns error', () => {
  const result = validateReminderInput({
    window_days: 0
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'window_days must be a positive number');
});

Deno.test('Reminder Validation - Valid with custom window_days passes', () => {
  const result = validateReminderInput({
    window_days: 30
  });

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test('Reminder Validation - No parameters passes (all optional)', () => {
  const result = validateReminderInput({});

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});
