import { supabase } from '../supabase';

/**
 * Crummey Service - Handles all operations for Crummey notices
 *
 * All functions return a standardized response format:
 * { success: boolean, data?: any, error?: string }
 */

// ============================================================================
// TYPES
// ============================================================================

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

export interface CrummeyNoticeWithDetails extends CrummeyNotice {
  beneficiary?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  gift?: {
    id: string;
    amount: number;
    gift_date: string;
    gift_type: string | null;
  };
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export type NoticeStatus = 'pending' | 'sent' | 'acknowledged' | 'exercised' | 'expired';

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single Crummey notice by ID
 *
 * @param noticeId - UUID of the Crummey notice
 * @returns ServiceResponse with notice data
 */
export async function getCrummeyNoticeById(
  noticeId: string
): Promise<ServiceResponse<CrummeyNotice>> {
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .select('*')
      .eq('id', noticeId)
      .single();

    if (error) {
      console.error('Error fetching Crummey notice:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch Crummey notice',
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Crummey notice not found',
      };
    }

    return {
      success: true,
      data: data as CrummeyNotice,
    };
  } catch (err) {
    console.error('Unexpected error fetching Crummey notice:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get all Crummey notices for a specific trust with optional beneficiary/gift details
 *
 * @param trustId - UUID of the trust
 * @param includeDetails - Whether to include beneficiary and gift details
 * @returns ServiceResponse with array of Crummey notices
 */
export async function getCrummeyNoticesForTrust(
  trustId: string,
  includeDetails: boolean = false
): Promise<ServiceResponse<CrummeyNotice[] | CrummeyNoticeWithDetails[]>> {
  try {
    let query = supabase
      .from('crummey_notices')
      .select(
        includeDetails
          ? `
            *,
            beneficiary:beneficiaries(id, name, email, phone),
            gift:gifts(id, amount, gift_date, gift_type)
          `
          : '*'
      )
      .eq('trust_id', trustId)
      .order('notice_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching Crummey notices for trust:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch Crummey notices',
      };
    }

    return {
      success: true,
      data: (data as any) || [],
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
 * Get all pending Crummey notices (status = 'pending')
 *
 * @param trustId - Optional: filter by trust ID
 * @returns ServiceResponse with array of pending notices
 */
export async function getPendingNotices(
  trustId?: string
): Promise<ServiceResponse<CrummeyNotice[]>> {
  try {
    let query = supabase
      .from('crummey_notices')
      .select('*')
      .eq('status', 'pending')
      .order('withdrawal_deadline', { ascending: true });

    if (trustId) {
      query = query.eq('trust_id', trustId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pending notices:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch pending notices',
      };
    }

    return {
      success: true,
      data: (data as CrummeyNotice[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error fetching pending notices:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get expired Crummey notices (withdrawal_deadline has passed and status is not 'exercised')
 *
 * @param trustId - Optional: filter by trust ID
 * @returns ServiceResponse with array of expired notices
 */
export async function getExpiredNotices(
  trustId?: string
): Promise<ServiceResponse<CrummeyNotice[]>> {
  try {
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('crummey_notices')
      .select('*')
      .lt('withdrawal_deadline', today)
      .neq('status', 'exercised')
      .neq('status', 'expired')
      .order('withdrawal_deadline', { ascending: false });

    if (trustId) {
      query = query.eq('trust_id', trustId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching expired notices:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch expired notices',
      };
    }

    return {
      success: true,
      data: (data as CrummeyNotice[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error fetching expired notices:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get notices by beneficiary
 *
 * @param beneficiaryId - UUID of the beneficiary
 * @returns ServiceResponse with array of notices
 */
export async function getNoticesForBeneficiary(
  beneficiaryId: string
): Promise<ServiceResponse<CrummeyNotice[]>> {
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('notice_date', { ascending: false });

    if (error) {
      console.error('Error fetching notices for beneficiary:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch notices',
      };
    }

    return {
      success: true,
      data: (data as CrummeyNotice[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error fetching notices:', err);
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
 * Update the status of a Crummey notice
 *
 * @param noticeId - UUID of the notice
 * @param status - New status value
 * @returns ServiceResponse with updated notice
 */
export async function updateNoticeStatus(
  noticeId: string,
  status: NoticeStatus
): Promise<ServiceResponse<CrummeyNotice>> {
  try {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // If marking as exercised, set withdrawal_exercised flag and withdrawn_at timestamp
    if (status === 'exercised') {
      updates.withdrawal_exercised = true;
      updates.withdrawn_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('crummey_notices')
      .update(updates)
      .eq('id', noticeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating notice status:', error);
      return {
        success: false,
        error: error.message || 'Failed to update notice status',
      };
    }

    return {
      success: true,
      data: data as CrummeyNotice,
    };
  } catch (err) {
    console.error('Unexpected error updating notice status:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Mark a Crummey notice as sent
 *
 * @param noticeId - UUID of the notice
 * @param sentAt - Optional: timestamp when sent (defaults to now)
 * @returns ServiceResponse with updated notice
 */
export async function markAsSent(
  noticeId: string,
  sentAt?: string
): Promise<ServiceResponse<CrummeyNotice>> {
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .update({
        status: 'sent',
        sent_at: sentAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', noticeId)
      .select()
      .single();

    if (error) {
      console.error('Error marking notice as sent:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark notice as sent',
      };
    }

    return {
      success: true,
      data: data as CrummeyNotice,
    };
  } catch (err) {
    console.error('Unexpected error marking notice as sent:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Mark a Crummey notice as acknowledged
 *
 * @param noticeId - UUID of the notice
 * @param acknowledgedAt - Optional: timestamp when acknowledged (defaults to now)
 * @returns ServiceResponse with updated notice
 */
export async function markAsAcknowledged(
  noticeId: string,
  acknowledgedAt?: string
): Promise<ServiceResponse<CrummeyNotice>> {
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .update({
        status: 'acknowledged',
        acknowledged_at: acknowledgedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', noticeId)
      .select()
      .single();

    if (error) {
      console.error('Error marking notice as acknowledged:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark notice as acknowledged',
      };
    }

    return {
      success: true,
      data: data as CrummeyNotice,
    };
  } catch (err) {
    console.error('Unexpected error marking notice as acknowledged:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Mark a Crummey notice as exercised (withdrawal was made)
 *
 * @param noticeId - UUID of the notice
 * @param withdrawnAt - Optional: timestamp when withdrawn (defaults to now)
 * @returns ServiceResponse with updated notice
 */
export async function markAsExercised(
  noticeId: string,
  withdrawnAt?: string
): Promise<ServiceResponse<CrummeyNotice>> {
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .update({
        status: 'exercised',
        withdrawal_exercised: true,
        withdrawn_at: withdrawnAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', noticeId)
      .select()
      .single();

    if (error) {
      console.error('Error marking notice as exercised:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark notice as exercised',
      };
    }

    return {
      success: true,
      data: data as CrummeyNotice,
    };
  } catch (err) {
    console.error('Unexpected error marking notice as exercised:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Update document generation status
 *
 * @param noticeId - UUID of the notice
 * @param documentPath - Path to the generated document
 * @returns ServiceResponse with updated notice
 */
export async function updateDocumentStatus(
  noticeId: string,
  documentPath: string
): Promise<ServiceResponse<CrummeyNotice>> {
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .update({
        document_generated: true,
        document_path: documentPath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noticeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating document status:', error);
      return {
        success: false,
        error: error.message || 'Failed to update document status',
      };
    }

    return {
      success: true,
      data: data as CrummeyNotice,
    };
  } catch (err) {
    console.error('Unexpected error updating document status:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Mark multiple notices as sent (bulk operation)
 *
 * @param noticeIds - Array of notice UUIDs
 * @param sentAt - Optional: timestamp when sent (defaults to now)
 * @returns ServiceResponse with array of updated notices
 */
export async function bulkMarkAsSent(
  noticeIds: string[],
  sentAt?: string
): Promise<ServiceResponse<CrummeyNotice[]>> {
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .update({
        status: 'sent',
        sent_at: sentAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', noticeIds)
      .select();

    if (error) {
      console.error('Error bulk marking notices as sent:', error);
      return {
        success: false,
        error: error.message || 'Failed to bulk mark notices as sent',
      };
    }

    return {
      success: true,
      data: (data as CrummeyNotice[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error bulk marking notices as sent:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Auto-expire notices that have passed their withdrawal deadline
 *
 * @param trustId - Optional: only expire notices for this trust
 * @returns ServiceResponse with count of expired notices
 */
export async function autoExpireNotices(
  trustId?: string
): Promise<ServiceResponse<number>> {
  try {
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('crummey_notices')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .lt('withdrawal_deadline', today)
      .in('status', ['pending', 'sent', 'acknowledged'])
      .select('id');

    if (trustId) {
      query = query.eq('trust_id', trustId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error auto-expiring notices:', error);
      return {
        success: false,
        error: error.message || 'Failed to auto-expire notices',
      };
    }

    return {
      success: true,
      data: data?.length || 0,
    };
  } catch (err) {
    console.error('Unexpected error auto-expiring notices:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * Get notice statistics for a trust
 *
 * @param trustId - UUID of the trust
 * @returns ServiceResponse with statistics object
 */
export async function getNoticeStats(
  trustId: string
): Promise<ServiceResponse<{
  total: number;
  pending: number;
  sent: number;
  acknowledged: number;
  exercised: number;
  expired: number;
}>> {
  try {
    const { data, error } = await supabase
      .from('crummey_notices')
      .select('status')
      .eq('trust_id', trustId);

    if (error) {
      console.error('Error fetching notice stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch notice statistics',
      };
    }

    const stats = {
      total: data?.length || 0,
      pending: data?.filter((n) => n.status === 'pending').length || 0,
      sent: data?.filter((n) => n.status === 'sent').length || 0,
      acknowledged: data?.filter((n) => n.status === 'acknowledged').length || 0,
      exercised: data?.filter((n) => n.status === 'exercised').length || 0,
      expired: data?.filter((n) => n.status === 'expired').length || 0,
    };

    return {
      success: true,
      data: stats,
    };
  } catch (err) {
    console.error('Unexpected error fetching notice stats:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}
