import { supabase } from '../supabase';

/**
 * Trust Service - Handles all CRUD operations for trusts
 *
 * All functions return a standardized response format:
 * { success: boolean, data?: any, error?: string }
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Trust {
  id: string;
  grantor_name: string;
  trust_name: string;
  trust_date: string;
  trust_type: string;
  status: string;
  crm_reference?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all trusts for the attorney (all trusts in the system)
 *
 * @returns ServiceResponse with array of trusts
 */
export async function getAttorneyTrusts(): Promise<ServiceResponse<Trust[]>> {
  try {
    const { data, error } = await supabase
      .from('trusts')
      .select('*')
      .order('trust_name', { ascending: true });

    if (error) {
      console.error('Error fetching trusts:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch trusts',
      };
    }

    return {
      success: true,
      data: (data as Trust[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error fetching trusts:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get a single trust by ID
 *
 * @param trustId - UUID of the trust
 * @returns ServiceResponse with trust data
 */
export async function getTrustById(
  trustId: string
): Promise<ServiceResponse<Trust>> {
  try {
    const { data, error } = await supabase
      .from('trusts')
      .select('*')
      .eq('id', trustId)
      .single();

    if (error) {
      console.error('Error fetching trust:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch trust',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Trust not found',
      };
    }

    return {
      success: true,
      data: data as Trust,
    };
  } catch (err) {
    console.error('Unexpected error fetching trust:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get a single trust by name
 *
 * @param trustName - Name of the trust
 * @returns ServiceResponse with trust data (null if not found)
 */
export async function getTrustByName(
  trustName: string
): Promise<ServiceResponse<Trust | null>> {
  try {
    const { data, error } = await supabase
      .from('trusts')
      .select('*')
      .eq('trust_name', trustName)
      .maybeSingle();

    if (error) {
      console.error('Error fetching trust by name:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch trust',
      };
    }

    return {
      success: true,
      data: data as Trust | null,
    };
  } catch (err) {
    console.error('Unexpected error fetching trust by name:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

export interface CreateTrustData {
  grantor_name: string;
  trust_name: string;
  trust_date: string;
  trust_type?: string;
  status?: string;
  crm_reference?: string | null;
}

/**
 * Create a new trust
 *
 * @param trustData - Trust data to create
 * @returns ServiceResponse with created trust data
 */
export async function createTrust(
  trustData: CreateTrustData
): Promise<ServiceResponse<Trust>> {
  try {
    // Validate required fields
    if (!trustData.grantor_name || !trustData.trust_name || !trustData.trust_date) {
      return {
        success: false,
        error: 'Missing required fields: grantor_name, trust_name, or trust_date',
      };
    }

    const { data, error } = await supabase
      .from('trusts')
      .insert({
        grantor_name: trustData.grantor_name,
        trust_name: trustData.trust_name,
        trust_date: trustData.trust_date,
        trust_type: trustData.trust_type || 'ILIT',
        status: trustData.status || 'active',
        crm_reference: trustData.crm_reference || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trust:', error);
      return {
        success: false,
        error: error.message || 'Failed to create trust',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Trust creation failed',
      };
    }

    return {
      success: true,
      data: data as Trust,
    };
  } catch (err) {
    console.error('Unexpected error creating trust:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

export interface UpdateTrustData {
  grantor_name?: string;
  trust_name?: string;
  trust_date?: string;
  trust_type?: string;
  status?: string;
  crm_reference?: string | null;
}

/**
 * Update a trust by ID with partial data
 *
 * @param trustId - UUID of the trust to update
 * @param trustData - Partial trust data to update
 * @returns ServiceResponse with updated trust data
 */
export async function updateTrust(
  trustId: string,
  trustData: UpdateTrustData
): Promise<ServiceResponse<Trust>> {
  try {
    // Validate that we have at least one field to update
    if (Object.keys(trustData).length === 0) {
      return {
        success: false,
        error: 'No data provided to update',
      };
    }

    const { data, error } = await supabase
      .from('trusts')
      .update({
        ...trustData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', trustId)
      .select()
      .single();

    if (error) {
      console.error('Error updating trust:', error);
      return {
        success: false,
        error: error.message || 'Failed to update trust',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Trust not found or update failed',
      };
    }

    return {
      success: true,
      data: data as Trust,
    };
  } catch (err) {
    console.error('Unexpected error updating trust:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}
