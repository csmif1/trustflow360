import { supabase } from '../supabase';
import { getCrummeyNoticeById } from './crummeyService';
import { markAsSent } from './crummeyService';

/**
 * Email Service - Handles email delivery for Crummey notices using Resend API
 *
 * All functions return a standardized response format:
 * { success: boolean, data?: any, error?: string }
 *
 * Setup: Add VITE_RESEND_API_KEY to your .env file
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  trust_id: string | null;
  crummey_notice_id: string | null;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  error_message: string | null;
  retry_count: number;
  email_service_id: string | null;
  created_at: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SendEmailResponse {
  emailLog: EmailLog;
  resendId?: string;
}

export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'failed' | 'bounced';

// ============================================================================
// EMAIL SENDING
// ============================================================================

/**
 * Send a Crummey notice email to a beneficiary
 *
 * @param noticeId - UUID of the Crummey notice
 * @param recipientEmail - Email address to send to
 * @param customTemplate - Optional: custom email template data
 * @returns ServiceResponse with email log and Resend ID
 */
export async function sendCrummeyNotice(
  noticeId: string,
  recipientEmail: string,
  customTemplate?: { subject?: string; body?: string }
): Promise<ServiceResponse<SendEmailResponse>> {
  try {
    // Step 1: Fetch the Crummey notice details
    const noticeResponse = await getCrummeyNoticeById(noticeId);
    if (!noticeResponse.success || !noticeResponse.data) {
      return {
        success: false,
        error: noticeResponse.error || 'Failed to fetch Crummey notice',
      };
    }

    const notice = noticeResponse.data;

    // Step 2: Fetch beneficiary details
    const { data: beneficiary, error: beneficiaryError } = await supabase
      .from('beneficiaries')
      .select('id, name, email')
      .eq('id', notice.beneficiary_id)
      .single();

    if (beneficiaryError || !beneficiary) {
      return {
        success: false,
        error: 'Failed to fetch beneficiary details',
      };
    }

    // Step 3: Fetch trust details
    const { data: trust, error: trustError } = await supabase
      .from('trusts')
      .select('id, trust_name')
      .eq('id', notice.trust_id)
      .single();

    if (trustError || !trust) {
      return {
        success: false,
        error: 'Failed to fetch trust details',
      };
    }

    // Step 4: Generate email content
    const subject =
      customTemplate?.subject ||
      `Crummey Notice - ${trust.trust_name} - Withdrawal Rights`;

    const emailBody =
      customTemplate?.body ||
      generateCrummeyEmailTemplate(notice, beneficiary.name, trust.trust_name);

    // Step 5: Send email via Resend API
    const resendResult = await sendViaResend({
      to: recipientEmail,
      subject,
      html: emailBody,
    });

    if (!resendResult.success) {
      // Create failed email log
      const failedLog = await createEmailLog({
        recipient_email: recipientEmail,
        recipient_name: beneficiary.name,
        subject,
        trust_id: notice.trust_id,
        crummey_notice_id: noticeId,
        status: 'failed',
        error_message: resendResult.error || 'Failed to send email',
      });

      return {
        success: false,
        error: resendResult.error,
        data: failedLog.data ? { emailLog: failedLog.data } : undefined,
      };
    }

    // Step 6: Create successful email log
    const emailLogResult = await createEmailLog({
      recipient_email: recipientEmail,
      recipient_name: beneficiary.name,
      subject,
      trust_id: notice.trust_id,
      crummey_notice_id: noticeId,
      status: 'sent',
      sent_at: new Date().toISOString(),
      email_service_id: resendResult.data?.id,
    });

    if (!emailLogResult.success) {
      return {
        success: false,
        error: 'Email sent but failed to create log',
      };
    }

    // Step 7: Update Crummey notice status to 'sent'
    await markAsSent(noticeId);

    return {
      success: true,
      data: {
        emailLog: emailLogResult.data!,
        resendId: resendResult.data?.id,
      },
    };
  } catch (err) {
    console.error('Unexpected error sending Crummey notice:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send Crummey notices to multiple recipients in bulk
 *
 * @param noticeIds - Array of Crummey notice UUIDs
 * @returns ServiceResponse with array of results for each notice
 */
export async function sendBulkNotices(
  noticeIds: string[]
): Promise<ServiceResponse<{ sent: string[]; failed: string[]; results: any[] }>> {
  try {
    const results = [];
    const sent = [];
    const failed = [];

    for (const noticeId of noticeIds) {
      // Fetch notice to get beneficiary email
      const noticeResponse = await getCrummeyNoticeById(noticeId);
      if (!noticeResponse.success || !noticeResponse.data) {
        failed.push(noticeId);
        results.push({
          noticeId,
          success: false,
          error: 'Failed to fetch notice',
        });
        continue;
      }

      const notice = noticeResponse.data;

      // Fetch beneficiary email
      const { data: beneficiary, error: beneficiaryError } = await supabase
        .from('beneficiaries')
        .select('email, name')
        .eq('id', notice.beneficiary_id)
        .single();

      if (beneficiaryError || !beneficiary?.email) {
        failed.push(noticeId);
        results.push({
          noticeId,
          success: false,
          error: 'Beneficiary email not found',
        });
        continue;
      }

      // Send email
      const sendResult = await sendCrummeyNotice(noticeId, beneficiary.email);

      if (sendResult.success) {
        sent.push(noticeId);
      } else {
        failed.push(noticeId);
      }

      results.push({
        noticeId,
        success: sendResult.success,
        error: sendResult.error,
        data: sendResult.data,
      });
    }

    return {
      success: true,
      data: {
        sent,
        failed,
        results,
      },
    };
  } catch (err) {
    console.error('Unexpected error sending bulk notices:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Resend a failed email
 *
 * @param emailLogId - UUID of the email log to resend
 * @returns ServiceResponse with updated email log
 */
export async function resendEmail(
  emailLogId: string
): Promise<ServiceResponse<SendEmailResponse>> {
  try {
    // Step 1: Fetch the email log
    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', emailLogId)
      .single();

    if (logError || !emailLog) {
      return {
        success: false,
        error: 'Email log not found',
      };
    }

    // Step 2: Check if it has a Crummey notice ID
    if (!emailLog.crummey_notice_id) {
      return {
        success: false,
        error: 'Email log is not associated with a Crummey notice',
      };
    }

    // Step 3: Fetch notice details to regenerate email
    const noticeResponse = await getCrummeyNoticeById(emailLog.crummey_notice_id);
    if (!noticeResponse.success || !noticeResponse.data) {
      return {
        success: false,
        error: 'Failed to fetch Crummey notice',
      };
    }

    const notice = noticeResponse.data;

    // Step 4: Fetch beneficiary and trust details
    const { data: beneficiary } = await supabase
      .from('beneficiaries')
      .select('name')
      .eq('id', notice.beneficiary_id)
      .single();

    const { data: trust } = await supabase
      .from('trusts')
      .select('trust_name')
      .eq('id', notice.trust_id)
      .single();

    // Step 5: Regenerate email content
    const emailBody = generateCrummeyEmailTemplate(
      notice,
      beneficiary?.name || emailLog.recipient_name || 'Beneficiary',
      trust?.trust_name || 'Trust'
    );

    // Step 6: Send via Resend
    const resendResult = await sendViaResend({
      to: emailLog.recipient_email,
      subject: emailLog.subject,
      html: emailBody,
    });

    if (!resendResult.success) {
      // Update email log with failure
      await supabase
        .from('email_logs')
        .update({
          status: 'failed',
          error_message: resendResult.error,
          retry_count: emailLog.retry_count + 1,
        })
        .eq('id', emailLogId);

      return {
        success: false,
        error: resendResult.error,
      };
    }

    // Step 7: Update email log with success
    const { data: updatedLog, error: updateError } = await supabase
      .from('email_logs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        error_message: null,
        retry_count: emailLog.retry_count + 1,
        email_service_id: resendResult.data?.id,
      })
      .eq('id', emailLogId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: 'Email sent but failed to update log',
      };
    }

    return {
      success: true,
      data: {
        emailLog: updatedLog as EmailLog,
        resendId: resendResult.data?.id,
      },
    };
  } catch (err) {
    console.error('Unexpected error resending email:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// EMAIL LOG MANAGEMENT
// ============================================================================

/**
 * Track email status (delivered, opened, bounced, etc.)
 *
 * @param emailLogId - UUID of the email log
 * @param status - New email status
 * @param timestamp - Optional: timestamp of the status change
 * @returns ServiceResponse with updated email log
 */
export async function trackEmailStatus(
  emailLogId: string,
  status: EmailStatus,
  timestamp?: string
): Promise<ServiceResponse<EmailLog>> {
  try {
    const updates: any = {
      status,
    };

    const eventTime = timestamp || new Date().toISOString();

    // Set appropriate timestamp based on status
    if (status === 'delivered') {
      updates.delivered_at = eventTime;
    } else if (status === 'opened') {
      updates.opened_at = eventTime;
    }

    const { data, error } = await supabase
      .from('email_logs')
      .update(updates)
      .eq('id', emailLogId)
      .select()
      .single();

    if (error) {
      console.error('Error tracking email status:', error);
      return {
        success: false,
        error: error.message || 'Failed to track email status',
      };
    }

    return {
      success: true,
      data: data as EmailLog,
    };
  } catch (err) {
    console.error('Unexpected error tracking email status:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get all email logs for a specific trust
 *
 * @param trustId - UUID of the trust
 * @returns ServiceResponse with array of email logs
 */
export async function getEmailLogsForTrust(
  trustId: string
): Promise<ServiceResponse<EmailLog[]>> {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('trust_id', trustId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching email logs:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch email logs',
      };
    }

    return {
      success: true,
      data: (data as EmailLog[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error fetching email logs:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get email logs by status
 *
 * @param status - Email status to filter by
 * @param trustId - Optional: filter by trust ID
 * @returns ServiceResponse with array of email logs
 */
export async function getEmailLogsByStatus(
  status: EmailStatus,
  trustId?: string
): Promise<ServiceResponse<EmailLog[]>> {
  try {
    let query = supabase
      .from('email_logs')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (trustId) {
      query = query.eq('trust_id', trustId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching email logs by status:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch email logs',
      };
    }

    return {
      success: true,
      data: (data as EmailLog[]) || [],
    };
  } catch (err) {
    console.error('Unexpected error fetching email logs:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an email log entry
 */
async function createEmailLog(logData: {
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  trust_id: string;
  crummey_notice_id: string;
  status: string;
  sent_at?: string | null;
  delivered_at?: string | null;
  error_message?: string | null;
  email_service_id?: string | null;
}): Promise<ServiceResponse<EmailLog>> {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .insert({
        ...logData,
        retry_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating email log:', error);
      return {
        success: false,
        error: error.message || 'Failed to create email log',
      };
    }

    return {
      success: true,
      data: data as EmailLog,
    };
  } catch (err) {
    console.error('Unexpected error creating email log:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send email via Resend API
 */
async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<ServiceResponse<{ id: string }>> {
  try {
    const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;

    if (!resendApiKey) {
      return {
        success: false,
        error: 'Resend API key not configured. Add VITE_RESEND_API_KEY to .env',
      };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'TrustFlow360 <notices@trustflow360.com>',
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to send email via Resend',
      };
    }

    return {
      success: true,
      data: { id: result.id },
    };
  } catch (err) {
    console.error('Error sending via Resend:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email',
    };
  }
}

/**
 * Generate Crummey notice email template
 */
function generateCrummeyEmailTemplate(
  notice: any,
  beneficiaryName: string,
  trustName: string
): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(notice.withdrawal_amount);

  const noticeDate = new Date(notice.notice_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const deadline = new Date(notice.withdrawal_deadline).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crummey Notice - ${trustName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-left: 4px solid #4a90e2; padding: 20px; margin-bottom: 20px;">
    <h1 style="margin: 0 0 10px 0; color: #4a90e2; font-size: 24px;">Crummey Withdrawal Notice</h1>
    <p style="margin: 0; color: #666;">${trustName}</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <p>Dear ${beneficiaryName},</p>

    <p>This is to notify you that a gift has been made to the <strong>${trustName}</strong>. As a beneficiary of the trust, you have the right to withdraw a portion of this gift.</p>

    <div style="background-color: #f0f7ff; border: 1px solid #4a90e2; border-radius: 5px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Withdrawal Amount:</strong> ${formattedAmount}</p>
      <p style="margin: 0 0 10px 0;"><strong>Notice Date:</strong> ${noticeDate}</p>
      <p style="margin: 0; color: #d9534f;"><strong>Withdrawal Deadline:</strong> ${deadline} (${notice.withdrawal_period_days} days)</p>
    </div>

    <h2 style="color: #4a90e2; font-size: 18px; margin-top: 30px;">Important Information</h2>

    <p>You have <strong>${notice.withdrawal_period_days} days</strong> from the date of this notice to exercise your right to withdraw this amount from the trust. If you do not exercise this right within the specified time period, your withdrawal right will lapse.</p>

    <p><strong>To Exercise Your Withdrawal Right:</strong></p>
    <ul>
      <li>Contact the trustee in writing before the deadline</li>
      <li>Clearly state your intention to withdraw the specified amount</li>
      <li>Provide your contact information and any necessary banking details</li>
    </ul>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <strong>Note:</strong> This is an automated notice. Please consult with your attorney or financial advisor if you have questions about your withdrawal rights.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px;">
    <p>TrustFlow360 ILIT Administration Platform</p>
    <p>This email was sent regarding ${trustName}</p>
  </div>
</body>
</html>
  `;
}
