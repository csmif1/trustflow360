/**
 * Unit tests for record-premium-payment validation logic
 */

import { assertEquals } from '../_shared/test-utils.ts';

// Extract validation function for testing
function validatePaymentInput(body: any): { valid: boolean; error?: string } {
  if (!body.policy_id) {
    return { valid: false, error: 'Missing required field: policy_id' };
  }
  if (body.amount === undefined || body.amount === null) {
    return { valid: false, error: 'Missing required field: amount' };
  }
  if (!body.payment_date) {
    return { valid: false, error: 'Missing required field: payment_date' };
  }

  // Validate amount is positive
  if (typeof body.amount !== 'number' || body.amount <= 0) {
    return { valid: false, error: 'amount must be a positive number' };
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(body.payment_date)) {
    return { valid: false, error: 'payment_date must be in YYYY-MM-DD format' };
  }

  // Validate payment date is not in the future
  const paymentDate = new Date(body.payment_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (paymentDate > today) {
    return { valid: false, error: 'payment_date cannot be in the future' };
  }

  return { valid: true };
}

Deno.test('Payment Validation - Missing policy_id returns error', () => {
  const result = validatePaymentInput({
    amount: 15000,
    payment_date: '2026-01-15',
    payment_method: 'Check'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required field: policy_id');
});

Deno.test('Payment Validation - Missing amount returns error', () => {
  const result = validatePaymentInput({
    policy_id: 'policy-123',
    payment_date: '2026-01-15',
    payment_method: 'Check'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required field: amount');
});

Deno.test('Payment Validation - Missing payment_date returns error', () => {
  const result = validatePaymentInput({
    policy_id: 'policy-123',
    amount: 15000,
    payment_method: 'Check'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required field: payment_date');
});

Deno.test('Payment Validation - Negative amount returns error', () => {
  const result = validatePaymentInput({
    policy_id: 'policy-123',
    amount: -1000,
    payment_date: '2026-01-15'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'amount must be a positive number');
});

Deno.test('Payment Validation - Zero amount returns error', () => {
  const result = validatePaymentInput({
    policy_id: 'policy-123',
    amount: 0,
    payment_date: '2026-01-15'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'amount must be a positive number');
});

Deno.test('Payment Validation - Invalid date format returns error', () => {
  const result = validatePaymentInput({
    policy_id: 'policy-123',
    amount: 15000,
    payment_date: 'invalid-date'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'payment_date must be in YYYY-MM-DD format');
});

Deno.test('Payment Validation - Future date returns error', () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const result = validatePaymentInput({
    policy_id: 'policy-123',
    amount: 15000,
    payment_date: futureDateStr
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'payment_date cannot be in the future');
});

Deno.test('Payment Validation - Valid data passes', () => {
  const result = validatePaymentInput({
    policy_id: 'policy-123',
    amount: 15000,
    payment_date: '2026-01-15',
    payment_method: 'Check',
    gift_id: 'gift-456'
  });

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test('Payment Validation - Today\'s date is valid', () => {
  const today = new Date().toISOString().split('T')[0];

  const result = validatePaymentInput({
    policy_id: 'policy-123',
    amount: 15000,
    payment_date: today
  });

  assertEquals(result.valid, true);
});
