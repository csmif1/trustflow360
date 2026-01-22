import {
  createMockSupabaseClient,
  createTestRequest,
  createOptionsRequest,
  extractResponseData,
  assertEquals,
  assertExists
} from '../_shared/test-utils.ts';

Deno.test('Mock Supabase Client - from() returns query builder', () => {
  const client = createMockSupabaseClient();
  const builder = client.from('test_table');
  assertExists(builder);
});

Deno.test('Mock Supabase Client - insert and select', async () => {
  const client = createMockSupabaseClient();
  const result = await client
    .from('test_table')
    .insert({ name: 'test' })
    .select();

  assertExists(result.data);
  assertEquals(result.error, null);
});

Deno.test('Mock Supabase Client - with pre-populated data', async () => {
  const client = createMockSupabaseClient({
    test_table: [{ id: '1', name: 'existing' }]
  });

  const result = await client
    .from('test_table')
    .select()
    .eq('id', '1');

  assertExists(result.data);
  assertEquals(result.data?.length, 1);
});

Deno.test('Mock Supabase Client - with error', async () => {
  const client = createMockSupabaseClient(
    {},
    { test_table: { message: 'Test error' } }
  );

  const result = await client
    .from('test_table')
    .insert({ name: 'test' })
    .select();

  assertEquals(result.data, null);
  assertExists(result.error);
});

Deno.test('createTestRequest - creates valid request', () => {
  const req = createTestRequest({ test: 'data' });
  assertEquals(req.method, 'POST');
  assertExists(req.headers.get('Content-Type'));
});

Deno.test('createOptionsRequest - creates OPTIONS request', () => {
  const req = createOptionsRequest();
  assertEquals(req.method, 'OPTIONS');
});

Deno.test('extractResponseData - parses JSON response', async () => {
  const response = new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await extractResponseData(response);
  assertEquals(data.success, true);
});
