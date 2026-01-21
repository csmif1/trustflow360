import { supabase } from '../supabase';

/**
 * Policy Service - Handles all CRUD operations for insurance policies
 *
 * All functions return a standardized response format:
 * { success: boolean, data?: any, error?: string }
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PolicyData {
  policy_number: string;
  carrier: string;
  policy_type?: string | null;
  insured_name: string;
  insured_dob?: string | null;
  death_benefit?: number | null;
  cash_value?: number | null;
  policy_owner?: string | null;
  annual_premium?: number | null;
  premium_frequency?: string | null;
  premium_due_date?: string | null;
  next_premium_due?: string | null;
  policy_status?: string | null;
  issue_date?: string | null;
  notes?: string | null;
}

export interface Policy extends PolicyData {
  id: string;
  trust_id: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create a new insurance policy from AI-extracted data
 *
 * @param policyData - Policy details extracted from document
 * @param trustId - UUID of the trust this policy belongs to
 * @returns ServiceResponse with created policy data
 */
export async function createPolicy(
  policyData: PolicyData,
  trustId: string
): Promise<ServiceResponse<Policy>> {
  try {
    const { data, error } = await supabase
      .from('insurance_policies')
      .insert({
        ...policyData,
        trust_id: trustId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating policy:', error);
      return {
        success: false,
        error: error.message || 'Failed to create policy',
      };
    }

    return {
      success: true,
      data: data as Policy,
    };
  } catch (err) {
    console.error('Unexpected error creating policy:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single policy by ID
 *
 * @param policyId - UUID of the policy
 * @returns ServiceResponse with policy data
 */
export async function getPolicyById(
  policyId: string
): Promise<ServiceResponse<Policy>> {
  try {
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('id', policyId)
      .single();

    if (error) {
      console.error('Error fetching policy:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch policy',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Policy not found',
      };
    }

    return {
      success: true,
      data: data as Policy,
    };
  } catch (err) {
    console.error('Unexpected error fetching policy:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get all policies for a specific trust
 *
 * @param trustId - UUID of the trust
 * @returns ServiceResponse with array of policies
 */
export async function getPoliciesForTrust(
  trustId: string
): Promise<ServiceResponse<Policy[]>> {
  try {
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('trust_id', trustId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching policies for trust:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch policies',
      };
    }

    return {
      success: true,
      data: (data as Policy[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error fetching policies:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update policy details
 *
 * @param policyId - UUID of the policy to update
 * @param updates - Partial policy data to update
 * @returns ServiceResponse with updated policy data
 */
export async function updatePolicy(
  policyId: string,
  updates: Partial<PolicyData>
): Promise<ServiceResponse<Policy>> {
  try {
    const { data, error } = await supabase
      .from('insurance_policies')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', policyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating policy:', error);
      return {
        success: false,
        error: error.message || 'Failed to update policy',
      };
    }

    return {
      success: true,
      data: data as Policy,
    };
  } catch (err) {
    console.error('Unexpected error updating policy:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Link a policy to a trust (or change trust assignment)
 *
 * @param policyId - UUID of the policy
 * @param trustId - UUID of the trust to link to
 * @returns ServiceResponse with updated policy data
 */
export async function linkPolicyToTrust(
  policyId: string,
  trustId: string
): Promise<ServiceResponse<Policy>> {
  try {
    // First verify the policy exists
    const existingPolicy = await getPolicyById(policyId);
    if (!existingPolicy.success) {
      return existingPolicy;
    }

    // Check if already linked to this trust
    if (existingPolicy.data?.trust_id === trustId) {
      return {
        success: true,
        data: existingPolicy.data,
      };
    }

    // Update the trust_id
    const { data, error } = await supabase
      .from('insurance_policies')
      .update({
        trust_id: trustId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', policyId)
      .select()
      .single();

    if (error) {
      console.error('Error linking policy to trust:', error);
      return {
        success: false,
        error: error.message || 'Failed to link policy to trust',
      };
    }

    return {
      success: true,
      data: data as Policy,
    };
  } catch (err) {
    console.error('Unexpected error linking policy to trust:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete a policy
 *
 * @param policyId - UUID of the policy to delete
 * @returns ServiceResponse indicating success or failure
 */
export async function deletePolicy(
  policyId: string
): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabase
      .from('insurance_policies')
      .delete()
      .eq('id', policyId);

    if (error) {
      console.error('Error deleting policy:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete policy',
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error('Unexpected error deleting policy:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get policy by policy number
 *
 * @param policyNumber - The unique policy number
 * @returns ServiceResponse with policy data
 */
export async function getPolicyByNumber(
  policyNumber: string
): Promise<ServiceResponse<Policy>> {
  try {
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('policy_number', policyNumber)
      .single();

    if (error) {
      console.error('Error fetching policy by number:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch policy',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Policy not found',
      };
    }

    return {
      success: true,
      data: data as Policy,
    };
  } catch (err) {
    console.error('Unexpected error fetching policy by number:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if a policy number already exists
 *
 * @param policyNumber - The policy number to check
 * @returns ServiceResponse with boolean indicating if policy exists
 */
export async function policyNumberExists(
  policyNumber: string
): Promise<ServiceResponse<boolean>> {
  try {
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('id')
      .eq('policy_number', policyNumber)
      .maybeSingle();

    if (error) {
      console.error('Error checking policy number:', error);
      return {
        success: false,
        error: error.message || 'Failed to check policy number',
      };
    }

    return {
      success: true,
      data: !!data,
    };
  } catch (err) {
    console.error('Unexpected error checking policy number:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}
