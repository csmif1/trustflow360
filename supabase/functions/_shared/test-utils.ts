/**
 * Test utilities for edge functions
 * Provides mock Supabase client and test helpers
 */

export interface MockSupabaseClient {
  from: (table: string) => MockQueryBuilder;
  auth: {
    getUser: () => Promise<{ data: { user: any }, error: null }>;
  };
}

export class MockQueryBuilder {
  private table: string;
  private mockData: any[] = [];
  private mockError: any = null;
  private selectFields = '*';
  private filters: any[] = [];

  constructor(table: string, data: any[] = [], error: any = null) {
    this.table = table;
    this.mockData = data;
    this.mockError = error;
  }

  select(fields = '*') {
    this.selectFields = fields;
    return this;
  }

  insert(data: any) {
    if (this.mockError) {
      return this;
    }
    if (Array.isArray(data)) {
      this.mockData = data.map(d => ({ ...d, id: crypto.randomUUID() }));
    } else {
      this.mockData = [{ ...data, id: crypto.randomUUID() }];
    }
    return this;
  }

  update(data: any) {
    if (this.mockError) {
      return this;
    }
    this.mockData = this.mockData.map(d => ({ ...d, ...data }));
    return this;
  }

  delete() {
    if (this.mockError) {
      return this;
    }
    this.mockData = [];
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ type: 'lt', column, value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  single() {
    return this;
  }

  maybeSingle() {
    return this;
  }

  async then(resolve: any) {
    if (this.mockError) {
      return resolve({ data: null, error: this.mockError });
    }

    let filteredData = this.mockData;

    // Apply filters
    for (const filter of this.filters) {
      filteredData = filteredData.filter(item => {
        const itemValue = item[filter.column];
        switch (filter.type) {
          case 'eq': return itemValue === filter.value;
          case 'neq': return itemValue !== filter.value;
          case 'gt': return itemValue > filter.value;
          case 'gte': return itemValue >= filter.value;
          case 'lt': return itemValue < filter.value;
          case 'lte': return itemValue <= filter.value;
          default: return true;
        }
      });
    }

    return resolve({
      data: filteredData.length > 0 ? filteredData : null,
      error: null
    });
  }
}

export function createMockSupabaseClient(
  tableData: Record<string, any[]> = {},
  tableErrors: Record<string, any> = {}
): MockSupabaseClient {
  return {
    from: (table: string) => {
      return new MockQueryBuilder(
        table,
        tableData[table] || [],
        tableErrors[table] || null
      );
    },
    auth: {
      getUser: async () => ({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      })
    }
  };
}

export function createTestRequest(body: any, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:54321/functions/v1/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });
}

export function createOptionsRequest(): Request {
  return new Request('http://localhost:54321/functions/v1/test', {
    method: 'OPTIONS'
  });
}

export async function extractResponseData(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function assertSuccess(response: Response, message?: string) {
  if (!response.ok) {
    throw new Error(message || `Expected successful response, got ${response.status}`);
  }
}

export function assertEquals(actual: any, expected: any, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertExists(value: any, message?: string) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to exist');
  }
}
