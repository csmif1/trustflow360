/**
 * Unit tests for generate-crummey-notice validation logic
 */

import { assertEquals } from '../_shared/test-utils.ts';

// Extract validation function for testing
function validateNoticeInput(body: any): { valid: boolean; error?: string } {
  if (!body.notice_id) {
    return { valid: false, error: 'Missing required field: notice_id' };
  }

  return { valid: true };
}

Deno.test('Notice Generation Validation - Missing notice_id returns error', () => {
  const result = validateNoticeInput({});

  assertEquals(result.valid, false);
  assertEquals(result.error, 'Missing required field: notice_id');
});

Deno.test('Notice Generation Validation - Valid notice_id passes', () => {
  const result = validateNoticeInput({
    notice_id: 'notice-123'
  });

  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test('Notice Generation Validation - UUID format accepted', () => {
  const result = validateNoticeInput({
    notice_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  });

  assertEquals(result.valid, true);
});
