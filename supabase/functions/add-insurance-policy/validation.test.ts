/**
 * Unit tests for add-insurance-policy validation logic
 */

import { assertEquals } from '../_shared/test-utils.ts';

// Extract validation function for testing
function validatePolicyInput(body: any): { valid: boolean; error?: string } {
  if (!body.trust_id) {
    return { valid: false, error: 'Missing required field: trust_id' };
  }
  if (!body.carrier) {
    return { valid: false, error: 'Missing required field: carrier' };
  }
  if (!body.policy_number) {
    return { valid: false, error: 'Missing required field: policy_number' };
  }
  if (!body.insured_name) {
    return { valid: false, error: 'Missing required field: insured_name' };
  }

  if (body.annual_premium !== undefined && body.annual_premium !== null) {
    if (typeof body.annual_premium !== 'number' || body.annual_premium <= 0) {
      return { valid: false, error: 'annual_premium must be a positive number' };
    }
  }

  if (body.next_premium_due) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.next_premium_due)) {
      return { valid: false, error: 'next_premium_due must be in YYYY-MM-DD format' };
    }
  }

  if (body.premium_frequency) {
    const validFrequencies = ['annual', 'semi-annual', 'quarterly', 'monthly'];
    if (!validFrequencies.includes(body.premium_frequency)) {
      return { valid: false, error: 'premium_frequency must be one of: annual, semi-annual, quarterly, monthly' };
    }
  }

  return { valid: true };
}

Deno.test('Validation - Missing trust_id returns error', () => {
  const result = validatePolicyInput({
    carrier: 'State Farm',
    policy_number: 'SF-123',
    insured_name: 'John Doe'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required field: trust_id');
});

Deno.test('Validation - Missing carrier returns error', () => {
  const result = validatePolicyInput({
    trust_id: 'trust-123',
    policy_number: 'SF-123',
    insured_name: 'John Doe'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required field: carrier');
});

Deno.test('Validation - Missing policy_number returns error', () => {
  const result = validatePolicyInput({
    trust_id: 'trust-123',
    carrier: 'State Farm',
    insured_name: 'John Doe'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required field: policy_number');
});

Deno.test('Validation - Missing insured_name returns error', () => {
  const result = validatePolicyInput({
    trust_id: 'trust-123',
    carrier: 'State Farm',
    policy_number: 'SF-123'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required field: insured_name');
});

Deno.test('Validation - Negative annual_premium returns error', () => {
  const result = validatePolicyInput({
    trust_id: 'trust-123',
    carrier: 'State Farm',
    policy_number: 'SF-123',
    insured_name: 'John Doe',
    annual_premium: -1000
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'annual_premium must be a positive number');
});

Deno.test('Validation - Zero annual_premium returns error', () => {
  const result = validatePolicyInput({
    trust_id: 'trust-123',
    carrier: 'State Farm',
    policy_number: 'SF-123',
    insured_name: 'John Doe',
    annual_premium: 0
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'annual_premium must be a positive number');
});

Deno.test('Validation - Invalid date format returns error', () => {
  const result = validatePolicyInput({
    trust_id: 'trust-123',
    carrier: 'State Farm',
    policy_number: 'SF-123',
    insured_name: 'John Doe',
    next_premium_due: 'not-a-date'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'next_premium_due must be in YYYY-MM-DD format');
});

Deno.test('Validation - Invalid premium_frequency returns error', () => {
  const result = validatePolicyInput({
    trust_id: 'trust-123',
    carrier: 'State Farm',
    policy_number: 'SF-123',
    insured_name: 'John Doe',
    premium_frequency: 'invalid'
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'premium_frequency must be one of: annual, semi-annual, quarterly, monthly');
});

Deno.test('Validation - Valid data passes', () => {
  const result = validatePolicyInput({
    trust_id: 'trust-123',
    carrier: 'State Farm',
    policy_number: 'SF-123',
    insured_name: 'John Doe',
    annual_premium: 15000,
    premium_frequency: 'annual',
    next_premium_due: '2026-06-15'
  });

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test('Validation - All valid premium frequencies accepted', () => {
  const validFrequencies = ['annual', 'semi-annual', 'quarterly', 'monthly'];

  for (const frequency of validFrequencies) {
    const result = validatePolicyInput({
      trust_id: 'trust-123',
      carrier: 'State Farm',
      policy_number: 'SF-123',
      insured_name: 'John Doe',
      premium_frequency: frequency
    });

    assertEquals(result.valid, true);
  }
});
