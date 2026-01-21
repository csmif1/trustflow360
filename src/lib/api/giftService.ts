import { supabase } from '../supabase';

/**
 * Gift Service - Handles all CRUD operations for gifts
 *
 * All functions return a standardized response format:
 * { success: boolean, data?: any, error?: string }
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GiftData {
  contributor_name: string;
  contribution_date: string;
  amount: number;
  contribution_type?: string | null;
  status?: string | null;
  notes?: string | null;
}

export interface Gift extends GiftData {
  id: string;
  trust_id: string;
  created_at: string;
  updated_at: string;
}

export interface CrummeyNotice {
  id: string;
  gift_id: string;
  trust_id: string;
  beneficiary_id: string;
  notice_date: string;
  withdrawal_deadline: string;
  withdrawal_amount: number;
  withdrawal_period_days: number;
  status: string;
  sent_at: string | null;
  acknowledged_at: string | null;
  withdrawn_at: string | null;
  withdrawal_exercised: boolean;
  document_generated: boolean;
  document_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RecordGiftResponse {
  gift: Gift;
  crummeyNotices: CrummeyNotice[];
}

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Record a new gift/contribution and auto-generate Crummey notices for all beneficiaries
 *
 * @param giftData - Gift details (contributor_name, contribution_date, amount, etc.)
 * @param trustId - UUID of the trust this gift belongs to
 * @param withdrawalPeriodDays - Days beneficiaries have to withdraw (default: 30)
 * @returns ServiceResponse with created gift and generated Crummey notices
 */
export async function recordGift(
  giftData: GiftData,
  trustId: string,
  withdrawalPeriodDays: number = 30
): Promise<ServiceResponse<RecordGiftResponse>> {
  try {
    // Step 1: Insert the contribution
    const { data: giftRecord, error: giftError } = await supabase
      .from('contributions')
      .insert({
        ...giftData,
        trust_id: trustId,
      })
      .select()
      .single();

    if (giftError) {
      console.error('Error creating gift:', giftError);
      return {
        success: false,
        error: giftError.message || 'Failed to create gift',
      };
    }

    // Step 2: Fetch all beneficiaries for this trust
    const { data: beneficiaries, error: beneficiariesError } = await supabase
      .from('beneficiaries')
      .select('id, name, percentage')
      .eq('trust_id', trustId);

    if (beneficiariesError) {
      console.error('Error fetching beneficiaries:', beneficiariesError);
      return {
        success: false,
        error: beneficiariesError.message || 'Failed to fetch beneficiaries',
      };
    }

    if (!beneficiaries || beneficiaries.length === 0) {
      console.warn('No beneficiaries found for trust:', trustId);
      return {
        success: true,
        data: {
          gift: giftRecord as Gift,
          crummeyNotices: [],
        },
      };
    }

    // Step 3: Calculate withdrawal deadline
    const giftDate = new Date(giftData.contribution_date);
    const withdrawalDeadline = new Date(giftDate);
    withdrawalDeadline.setDate(withdrawalDeadline.getDate() + withdrawalPeriodDays);

    // Step 4: Calculate withdrawal amount for each beneficiary
    // If beneficiaries have percentages, split by percentage; otherwise split equally
    const totalPercentage = beneficiaries.reduce(
      (sum, b) => sum + (b.percentage || 0),
      0
    );
    const usePercentages = totalPercentage > 0;

    // Step 5: Generate Crummey notices for all beneficiaries
    const crummeyNoticesData = beneficiaries.map((beneficiary) => {
      let withdrawalAmount: number;

      if (usePercentages && beneficiary.percentage) {
        withdrawalAmount = (giftData.amount * beneficiary.percentage) / 100;
      } else {
        withdrawalAmount = giftData.amount / beneficiaries.length;
      }

      return {
        gift_id: giftRecord.id,
        trust_id: trustId,
        beneficiary_id: beneficiary.id,
        notice_date: giftData.contribution_date,
        withdrawal_deadline: withdrawalDeadline.toISOString().split('T')[0],
        withdrawal_amount: withdrawalAmount,
        withdrawal_period_days: withdrawalPeriodDays,
        status: 'pending',
        withdrawal_exercised: false,
        document_generated: false,
      };
    });

    const { data: crummeyNotices, error: crummeyError } = await supabase
      .from('crummey_notices')
      .insert(crummeyNoticesData)
      .select();

    if (crummeyError) {
      console.error('Error creating Crummey notices:', crummeyError);
      // Don't fail the entire operation if notices fail
      // Log the error but return the gift
      return {
        success: true,
        data: {
          gift: giftRecord as Gift,
          crummeyNotices: [],
        },
        error: `Gift created but failed to generate Crummey notices: ${crummeyError.message}`,
      };
    }

    return {
      success: true,
      data: {
        gift: giftRecord as Gift,
        crummeyNotices: (crummeyNotices as CrummeyNotice[]) || [],
      },
    };
  } catch (err) {
    console.error('Unexpected error recording gift:', err);
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
 * Get a single gift by ID
 *
 * @param giftId - UUID of the gift
 * @returns ServiceResponse with gift data
 */
export async function getGiftById(
  giftId: string
): Promise<ServiceResponse<Gift>> {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('id', giftId)
      .single();

    if (error) {
      console.error('Error fetching gift:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch gift',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Gift not found',
      };
    }

    return {
      success: true,
      data: data as Gift,
    };
  } catch (err) {
    console.error('Unexpected error fetching gift:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get all gifts for a specific trust
 *
 * @param trustId - UUID of the trust
 * @returns ServiceResponse with array of gifts
 */
export async function getGiftsForTrust(
  trustId: string
): Promise<ServiceResponse<Gift[]>> {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('trust_id', trustId)
      .order('contribution_date', { ascending: false });

    if (error) {
      console.error('Error fetching gifts for trust:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch gifts',
      };
    }

    return {
      success: true,
      data: (data as Gift[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error fetching gifts:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get all gifts for a specific contributor
 *
 * @param contributorName - Name of the contributor
 * @returns ServiceResponse with array of gifts
 */
export async function getGiftsForBeneficiary(
  contributorName: string
): Promise<ServiceResponse<Gift[]>> {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('contributor_name', contributorName)
      .order('contribution_date', { ascending: false });

    if (error) {
      console.error('Error fetching gifts for beneficiary:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch gifts',
      };
    }

    return {
      success: true,
      data: (data as Gift[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error fetching gifts:', err);
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
 * Update gift details
 *
 * @param giftId - UUID of the gift to update
 * @param updates - Partial gift data to update
 * @returns ServiceResponse with updated gift data
 */
export async function updateGift(
  giftId: string,
  updates: Partial<GiftData>
): Promise<ServiceResponse<Gift>> {
  try {
    const { data, error } = await supabase
      .from('contributions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', giftId)
      .select()
      .single();

    if (error) {
      console.error('Error updating gift:', error);
      return {
        success: false,
        error: error.message || 'Failed to update gift',
      };
    }

    return {
      success: true,
      data: data as Gift,
    };
  } catch (err) {
    console.error('Unexpected error updating gift:', err);
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
 * Delete a gift (cascade deletes associated Crummey notices)
 *
 * @param giftId - UUID of the gift to delete
 * @returns ServiceResponse indicating success or failure
 */
export async function deleteGift(
  giftId: string
): Promise<ServiceResponse<void>> {
  try {
    const { error } = await supabase
      .from('contributions')
      .delete()
      .eq('id', giftId);

    if (error) {
      console.error('Error deleting gift:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete gift',
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error('Unexpected error deleting gift:', err);
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
 * Get Crummey notices for a specific gift
 *
 * @param giftId - UUID of the gift
 * @returns ServiceResponse with array of Crummey notices
 */
export async function getCrummeyNoticesForGift(
  giftId: string
): Promise<ServiceResponse<CrummeyNotice[]>> {
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .select('*')
      .eq('gift_id', giftId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching Crummey notices:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch Crummey notices',
      };
    }

    return {
      success: true,
      data: (data as CrummeyNotice[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error fetching Crummey notices:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get gift total for a trust within a date range
 *
 * @param trustId - UUID of the trust
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns ServiceResponse with total gift amount
 */
export async function getGiftTotalForTrust(
  trustId: string,
  startDate?: string,
  endDate?: string
): Promise<ServiceResponse<number>> {
  try {
    let query = supabase
      .from('contributions')
      .select('amount')
      .eq('trust_id', trustId);

    if (startDate) {
      query = query.gte('contribution_date', startDate);
    }
    if (endDate) {
      query = query.lte('contribution_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error calculating gift total:', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate gift total',
      };
    }

    const total = data?.reduce((sum, gift) => sum + (gift.amount || 0), 0) || 0;

    return {
      success: true,
      data: total,
    };
  } catch (err) {
    console.error('Unexpected error calculating gift total:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}
