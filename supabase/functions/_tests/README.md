# Edge Functions Test Infrastructure

This directory contains the test infrastructure for TrustFlow360 edge functions.

## Running Tests

### From project root:
```bash
npm run test:edge              # Run all tests
npm run test:edge:watch        # Run tests in watch mode
```

### From supabase/functions directory:
```bash
deno test --allow-all --no-check                    # Run all tests
deno test --allow-all --no-check --watch            # Watch mode
deno test --allow-all --no-check <test-file>        # Run specific test
```

## Test Structure

- `_shared/test-utils.ts` - Mock Supabase client and test helpers
- `_tests/` - Test infrastructure tests
- `<function-name>/<function-name>.test.ts` - Function-specific tests

## Writing Tests

### Basic Test Structure

```typescript
import { createMockSupabaseClient, createTestRequest, extractResponseData } from '../_shared/test-utils.ts';

Deno.test('Function name - should do something', async () => {
  // Arrange
  const mockClient = createMockSupabaseClient({
    table_name: [{ id: '1', field: 'value' }]
  });

  const request = createTestRequest({
    field: 'value'
  });

  // Act
  const response = await handler(request);
  const data = await extractResponseData(response);

  // Assert
  assertEquals(response.status, 200);
  assertExists(data.result);
});
```

### Mock Data Setup

```typescript
const mockClient = createMockSupabaseClient({
  // Pre-populate tables with data
  insurance_policies: [
    { id: 'policy-1', carrier: 'Test Carrier', policy_number: 'P123' }
  ],
  gifts: [
    { id: 'gift-1', amount: 10000, gift_date: '2026-01-01' }
  ]
});
```

### Mock Errors

```typescript
const mockClient = createMockSupabaseClient(
  {}, // No data
  { insurance_policies: { message: 'Database error', code: '500' } } // Errors
);
```

## Test Coverage Requirements

Each edge function should have tests for:
1. Happy path (valid input returns expected output)
2. Missing required fields (returns 400)
3. Invalid IDs (returns 404)
4. Duplicate data (returns 409 if applicable)
5. Edge cases specific to the function

## CI/CD

Tests are designed to run in isolation without requiring:
- Live database connection
- Environment variables
- External API keys

This enables CI/CD pipelines to run tests without infrastructure dependencies.
