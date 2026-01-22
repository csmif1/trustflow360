/**
 * Unit tests for calculate-funds-sufficiency validation logic
 */

import { assertEquals } from '../_shared/test-utils.ts';

// Extract validation function for testing
function validateSufficiencyInput(body: any): { valid: boolean; error?: string } {
  if (!body.trust_id) {
    return { valid: false, error: 'Missing required field: trust_id' };
  }

  // Validate lookahead_days if provided
  if (body.lookahead_days !== undefined && body.lookahead_days !== null) {
    if (typeof body.lookahead_days !== 'number' || body.lookahead_days < 1) {
      return { valid: false, error: 'lookahead_days must be a positive number' };
    }
  }

  return { valid: true };
}

Deno.test('Sufficiency Validation - Missing trust_id returns error', () => {
  const result = validateSufficiencyInput({
    lookahead_days: 90
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required field: trust_id');
});

Deno.test('Sufficiency Validation - Negative lookahead_days returns error', () => {
  const result = validateSufficiencyInput({
    trust_id: 'trust-123',
    lookahead_days: -30
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'lookahead_days must be a positive number');
});

Deno.test('Sufficiency Validation - Zero lookahead_days returns error', () => {
  const result = validateSufficiencyInput({
    trust_id: 'trust-123',
    lookahead_days: 0
  });

  assertEquals(result.valid, false);
  assertEquals(result.error, 'lookahead_days must be a positive number');
});

Deno.test('Sufficiency Validation - Valid data passes', () => {
  const result = validateSufficiencyInput({
    trust_id: 'trust-123'
  });

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test('Sufficiency Validation - Valid with custom lookahead_days passes', () => {
  const result = validateSufficiencyInput({
    trust_id: 'trust-123',
    lookahead_days: 30
  });

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test('Sufficiency Validation - Default lookahead_days not required', () => {
  const result = validateSufficiencyInput({
    trust_id: 'trust-123'
    // No lookahead_days specified
  });

  assertEquals(result.valid, true);
});
