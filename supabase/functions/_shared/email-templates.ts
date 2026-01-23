/**
 * Email Template System for TrustFlow360
 * Professional HTML email templates with plain text fallbacks
 */

// ============================================================================
// TEMPLATE DATA INTERFACES
// ============================================================================

export interface CrummeyNoticeData {
  beneficiary_name: string;
  trust_name: string;
  withdrawal_amount: number;
  notice_date: string;
  withdrawal_deadline: string;
  withdrawal_period_days: number;
  trustee_name?: string;
  trustee_email?: string;
}

export interface DeadlineAlertData {
  trustee_name: string;
  beneficiary_name: string;
  trust_name: string;
  withdrawal_amount: number;
  withdrawal_deadline: string;
  days_remaining: number;
  notice_sent_date: string;
}

export interface PremiumReminderData {
  trustee_name: string;
  trust_name: string;
  policy_number: string;
  carrier: string;
  premium_amount: number;
  due_date: string;
  days_until_due: number;
  available_funds: number;
  is_sufficient: boolean;
}

export interface RemediationAlertData {
  trustee_name: string;
  trustee_email: string;
  trust_name: string;
  policy_number: string;
  carrier: string;
  overall_status: 'healthy' | 'warning' | 'critical';
  health_score: number;
  check_date: string;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  remediation_actions: Array<{
    title: string;
    action_type: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date: string;
    days_until_due: number;
  }>;
}

// ============================================================================
// CRUMMEY NOTICE TEMPLATE
// ============================================================================

export function generateCrummeyNoticeHTML(data: CrummeyNoticeData): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.withdrawal_amount);

  const noticeDate = new Date(data.notice_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const deadline = new Date(data.withdrawal_deadline).toLocaleDateString('en-US', {
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
  <title>Crummey Notice - ${data.trust_name}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .header { font-size: 20px !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
              <h1 class="header" style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Crummey Withdrawal Notice</h1>
              <p style="margin: 10px 0 0 0; color: #f0f0f0; font-size: 16px;">${data.trust_name}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px;">Dear ${data.beneficiary_name},</p>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6;">
                This is to notify you that a gift has been made to the <strong>${data.trust_name}</strong>. As a beneficiary of the trust, you have the right to withdraw a portion of this gift.
              </p>

              <!-- Key Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 4px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-weight: 600; color: #333;">Withdrawal Amount:</span>
                          <span style="float: right; font-size: 18px; font-weight: 700; color: #667eea;">${formattedAmount}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                          <span style="font-weight: 600; color: #333;">Notice Date:</span>
                          <span style="float: right; color: #666;">${noticeDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                          <span style="font-weight: 600; color: #dc3545;">Withdrawal Deadline:</span>
                          <span style="float: right; font-weight: 600; color: #dc3545;">${deadline}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                          <span style="font-weight: 600; color: #333;">Withdrawal Period:</span>
                          <span style="float: right; color: #666;">${data.withdrawal_period_days} days</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Important Information -->
              <h2 style="color: #667eea; font-size: 18px; margin: 30px 0 15px 0; font-weight: 600;">Important Information</h2>

              <p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6;">
                You have <strong>${data.withdrawal_period_days} days</strong> from the date of this notice to exercise your right to withdraw this amount from the trust. If you do not exercise this right within the specified time period, your withdrawal right will lapse.
              </p>

              <h3 style="color: #333; font-size: 16px; margin: 20px 0 10px 0; font-weight: 600;">To Exercise Your Withdrawal Right:</h3>

              <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                <li>Contact the trustee in writing before the deadline</li>
                <li>Clearly state your intention to withdraw the specified amount</li>
                <li>Provide your contact information and any necessary banking details</li>
              </ul>

              ${data.trustee_name && data.trustee_email ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e7f3ff; border-radius: 4px; margin: 20px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0 0 5px 0; font-weight: 600; color: #333;">Trustee Contact:</p>
                    <p style="margin: 0; color: #666; font-size: 14px;">${data.trustee_name}</p>
                    <p style="margin: 5px 0 0 0; color: #667eea; font-size: 14px;">${data.trustee_email}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Legal Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0 0 0; padding: 20px 0; border-top: 1px solid #e0e0e0;">
                <tr>
                  <td style="font-size: 13px; color: #666; line-height: 1.6;">
                    <strong>Legal Notice:</strong> This is an automated notice generated in accordance with Internal Revenue Code Section 2503(c) and Crummey withdrawal rights. Please consult with your attorney or financial advisor if you have questions about your withdrawal rights or the tax implications of exercising them.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 5px 0; color: #999; font-size: 12px;">TrustFlow360 ILIT Administration Platform</p>
              <p style="margin: 0; color: #999; font-size: 12px;">This email was sent regarding ${data.trust_name}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateCrummeyNoticeText(data: CrummeyNoticeData): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.withdrawal_amount);

  const noticeDate = new Date(data.notice_date).toLocaleDateString('en-US');
  const deadline = new Date(data.withdrawal_deadline).toLocaleDateString('en-US');

  return `
CRUMMEY WITHDRAWAL NOTICE
${data.trust_name}

Dear ${data.beneficiary_name},

This is to notify you that a gift has been made to the ${data.trust_name}. As a beneficiary of the trust, you have the right to withdraw a portion of this gift.

KEY DETAILS:
- Withdrawal Amount: ${formattedAmount}
- Notice Date: ${noticeDate}
- Withdrawal Deadline: ${deadline}
- Withdrawal Period: ${data.withdrawal_period_days} days

IMPORTANT INFORMATION:
You have ${data.withdrawal_period_days} days from the date of this notice to exercise your right to withdraw this amount from the trust. If you do not exercise this right within the specified time period, your withdrawal right will lapse.

TO EXERCISE YOUR WITHDRAWAL RIGHT:
1. Contact the trustee in writing before the deadline
2. Clearly state your intention to withdraw the specified amount
3. Provide your contact information and any necessary banking details

${data.trustee_name && data.trustee_email ? `
TRUSTEE CONTACT:
${data.trustee_name}
${data.trustee_email}
` : ''}

LEGAL NOTICE:
This is an automated notice generated in accordance with Internal Revenue Code Section 2503(c) and Crummey withdrawal rights. Please consult with your attorney or financial advisor if you have questions about your withdrawal rights or the tax implications of exercising them.

---
TrustFlow360 ILIT Administration Platform
This email was sent regarding ${data.trust_name}
  `.trim();
}

// ============================================================================
// DEADLINE ALERT TEMPLATE (for Trustees)
// ============================================================================

export function generateDeadlineAlertHTML(data: DeadlineAlertData): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.withdrawal_amount);

  const deadline = new Date(data.withdrawal_deadline).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const urgencyColor = data.days_remaining <= 3 ? '#dc3545' : data.days_remaining <= 7 ? '#ffc107' : '#667eea';
  const urgencyText = data.days_remaining <= 3 ? 'URGENT' : data.days_remaining <= 7 ? 'Action Required' : 'Reminder';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crummey Notice Deadline Alert</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .header { font-size: 20px !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${urgencyColor}; padding: 30px 20px; text-align: center;">
              <p style="margin: 0 0 5px 0; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${urgencyText}</p>
              <h1 class="header" style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Crummey Notice Deadline Alert</h1>
              <p style="margin: 10px 0 0 0; color: #f0f0f0; font-size: 16px;">${data.trust_name}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px;">Dear ${data.trustee_name},</p>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6;">
                This is a reminder that a Crummey withdrawal notice for <strong>${data.beneficiary_name}</strong> is expiring soon.
              </p>

              <!-- Alert Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-left: 4px solid ${urgencyColor}; border-radius: 4px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: ${urgencyColor};">
                      ${data.days_remaining} Day${data.days_remaining !== 1 ? 's' : ''} Remaining
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                      The withdrawal period expires on ${deadline}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Notice Details -->
              <h2 style="color: #333; font-size: 18px; margin: 30px 0 15px 0; font-weight: 600;">Notice Details</h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 4px; margin: 15px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-weight: 600; color: #333;">Beneficiary:</span>
                          <span style="float: right; color: #666;">${data.beneficiary_name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                          <span style="font-weight: 600; color: #333;">Withdrawal Amount:</span>
                          <span style="float: right; font-weight: 600; color: #667eea;">${formattedAmount}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                          <span style="font-weight: 600; color: #333;">Notice Sent:</span>
                          <span style="float: right; color: #666;">${new Date(data.notice_sent_date).toLocaleDateString('en-US')}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                          <span style="font-weight: 600; color: #dc3545;">Deadline:</span>
                          <span style="float: right; font-weight: 600; color: #dc3545;">${deadline}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Required -->
              <h3 style="color: #333; font-size: 16px; margin: 25px 0 10px 0; font-weight: 600;">Action Required:</h3>

              <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                <li>Verify that the beneficiary received the notice</li>
                <li>Be prepared to process a withdrawal request if received</li>
                <li>Document the expiration if no withdrawal is made</li>
                <li>Maintain records for IRS compliance</li>
              </ul>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0 0 0; padding: 20px 0; border-top: 1px solid #e0e0e0;">
                <tr>
                  <td style="font-size: 13px; color: #666; line-height: 1.6;">
                    <strong>Note:</strong> This is an automated alert to help you track Crummey notice deadlines. Please ensure proper documentation and compliance with all legal requirements.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 5px 0; color: #999; font-size: 12px;">TrustFlow360 ILIT Administration Platform</p>
              <p style="margin: 0; color: #999; font-size: 12px;">Trustee Alert for ${data.trust_name}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateDeadlineAlertText(data: DeadlineAlertData): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.withdrawal_amount);

  const deadline = new Date(data.withdrawal_deadline).toLocaleDateString('en-US');
  const urgencyText = data.days_remaining <= 3 ? '*** URGENT ***' : data.days_remaining <= 7 ? '** ACTION REQUIRED **' : '* REMINDER *';

  return `
${urgencyText}
CRUMMEY NOTICE DEADLINE ALERT
${data.trust_name}

Dear ${data.trustee_name},

This is a reminder that a Crummey withdrawal notice for ${data.beneficiary_name} is expiring soon.

${data.days_remaining} DAY${data.days_remaining !== 1 ? 'S' : ''} REMAINING
The withdrawal period expires on ${deadline}

NOTICE DETAILS:
- Beneficiary: ${data.beneficiary_name}
- Withdrawal Amount: ${formattedAmount}
- Notice Sent: ${new Date(data.notice_sent_date).toLocaleDateString('en-US')}
- Deadline: ${deadline}

ACTION REQUIRED:
1. Verify that the beneficiary received the notice
2. Be prepared to process a withdrawal request if received
3. Document the expiration if no withdrawal is made
4. Maintain records for IRS compliance

NOTE:
This is an automated alert to help you track Crummey notice deadlines. Please ensure proper documentation and compliance with all legal requirements.

---
TrustFlow360 ILIT Administration Platform
Trustee Alert for ${data.trust_name}
  `.trim();
}

// ============================================================================
// PREMIUM REMINDER TEMPLATE
// ============================================================================

export function generatePremiumReminderHTML(data: PremiumReminderData): string {
  const formattedPremium = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.premium_amount);

  const formattedFunds = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.available_funds);

  const dueDate = new Date(data.due_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statusColor = data.is_sufficient ? '#28a745' : '#dc3545';
  const statusText = data.is_sufficient ? 'Funds Available' : 'Insufficient Funds';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Premium Payment Reminder</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .header { font-size: 20px !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #20a0ff 0%, #0c8ee7 100%); padding: 30px 20px; text-align: center;">
              <h1 class="header" style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Premium Payment Reminder</h1>
              <p style="margin: 10px 0 0 0; color: #f0f0f0; font-size: 16px;">${data.trust_name}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px;">Dear ${data.trustee_name},</p>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6;">
                This is a reminder that an insurance premium payment is due soon for <strong>${data.trust_name}</strong>.
              </p>

              <!-- Days Remaining Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e7f3ff; border-left: 4px solid #20a0ff; border-radius: 4px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 5px 0; font-size: 36px; font-weight: 700; color: #20a0ff;">${data.days_until_due}</p>
                    <p style="margin: 0; font-size: 14px; color: #666;">Day${data.days_until_due !== 1 ? 's' : ''} Until Due</p>
                  </td>
                </tr>
              </table>

              <!-- Policy Details -->
              <h2 style="color: #333; font-size: 18px; margin: 30px 0 15px 0; font-weight: 600;">Policy Details</h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 4px; margin: 15px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-weight: 600; color: #333;">Policy Number:</span>
                          <span style="float: right; color: #666;">${data.policy_number}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                          <span style="font-weight: 600; color: #333;">Carrier:</span>
                          <span style="float: right; color: #666;">${data.carrier}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                          <span style="font-weight: 600; color: #333;">Premium Amount:</span>
                          <span style="float: right; font-size: 18px; font-weight: 700; color: #20a0ff;">${formattedPremium}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                          <span style="font-weight: 600; color: #dc3545;">Due Date:</span>
                          <span style="float: right; font-weight: 600; color: #dc3545;">${dueDate}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Fund Status -->
              <h2 style="color: #333; font-size: 18px; margin: 30px 0 15px 0; font-weight: 600;">Fund Status</h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${data.is_sufficient ? '#d4edda' : '#f8d7da'}; border-left: 4px solid ${statusColor}; border-radius: 4px; margin: 15px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-weight: 600; color: #333;">Available Funds:</span>
                          <span style="float: right; font-weight: 600; color: ${statusColor};">${formattedFunds}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid ${statusColor}33;">
                          <span style="font-weight: 600; color: #333;">Status:</span>
                          <span style="float: right; font-weight: 700; color: ${statusColor};">${statusText}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${!data.is_sufficient ? `
              <!-- Alert -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin: 20px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; font-weight: 600; color: #856404;">⚠️ Action Required: Additional Funding Needed</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #856404;">
                      The trust has insufficient funds to cover this premium. Please arrange for additional gifts or funding before the due date.
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Next Steps -->
              <h3 style="color: #333; font-size: 16px; margin: 25px 0 10px 0; font-weight: 600;">Next Steps:</h3>

              <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                <li>Review the premium amount and due date</li>
                <li>${data.is_sufficient ? 'Verify funds are available for payment' : 'Arrange for additional funding if needed'}</li>
                <li>Coordinate payment with the insurance carrier</li>
                <li>Document the payment in TrustFlow360</li>
              </ul>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0 0 0; padding: 20px 0; border-top: 1px solid #e0e0e0;">
                <tr>
                  <td style="font-size: 13px; color: #666; line-height: 1.6;">
                    <strong>Note:</strong> This is an automated reminder to help you manage premium payments. Please ensure timely payment to maintain policy coverage.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 5px 0; color: #999; font-size: 12px;">TrustFlow360 ILIT Administration Platform</p>
              <p style="margin: 0; color: #999; font-size: 12px;">Premium Reminder for ${data.trust_name}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generatePremiumReminderText(data: PremiumReminderData): string {
  const formattedPremium = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.premium_amount);

  const formattedFunds = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(data.available_funds);

  const dueDate = new Date(data.due_date).toLocaleDateString('en-US');
  const statusText = data.is_sufficient ? 'FUNDS AVAILABLE' : '⚠️ INSUFFICIENT FUNDS';

  return `
PREMIUM PAYMENT REMINDER
${data.trust_name}

Dear ${data.trustee_name},

This is a reminder that an insurance premium payment is due soon for ${data.trust_name}.

${data.days_until_due} DAY${data.days_until_due !== 1 ? 'S' : ''} UNTIL DUE

POLICY DETAILS:
- Policy Number: ${data.policy_number}
- Carrier: ${data.carrier}
- Premium Amount: ${formattedPremium}
- Due Date: ${dueDate}

FUND STATUS:
- Available Funds: ${formattedFunds}
- Status: ${statusText}

${!data.is_sufficient ? `
*** ACTION REQUIRED ***
The trust has insufficient funds to cover this premium. Please arrange for additional gifts or funding before the due date.
` : ''}

NEXT STEPS:
1. Review the premium amount and due date
2. ${data.is_sufficient ? 'Verify funds are available for payment' : 'Arrange for additional funding if needed'}
3. Coordinate payment with the insurance carrier
4. Document the payment in TrustFlow360

NOTE:
This is an automated reminder to help you manage premium payments. Please ensure timely payment to maintain policy coverage.

---
TrustFlow360 ILIT Administration Platform
Premium Reminder for ${data.trust_name}
  `.trim();
}

// ============================================================================
// REMEDIATION ALERT TEMPLATE
// ============================================================================

export function generateRemediationAlertHTML(data: RemediationAlertData): string {
  const statusColors = {
    healthy: '#28a745',
    warning: '#ffc107',
    critical: '#dc3545'
  };

  const statusColor = statusColors[data.overall_status];
  const statusText = data.overall_status.toUpperCase();

  const priorityColors = {
    urgent: '#dc3545',
    high: '#ff6b6b',
    medium: '#ffc107',
    low: '#667eea'
  };

  const severityColors = {
    critical: '#dc3545',
    high: '#ff6b6b',
    medium: '#ffc107',
    low: '#6c757d'
  };

  const checkDate = new Date(data.check_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Filter critical/high severity issues
  const criticalIssues = data.issues.filter(i =>
    i.severity === 'critical' || i.severity === 'high'
  );

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Policy Health Alert - Action Required</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .header { font-size: 20px !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${statusColor}; padding: 30px 20px; text-align: center;">
              <p style="margin: 0 0 5px 0; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">POLICY HEALTH ALERT</p>
              <h1 class="header" style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Action Required</h1>
              <p style="margin: 10px 0 0 0; color: #f0f0f0; font-size: 16px;">${data.trust_name}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px;">Dear ${data.trustee_name},</p>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6;">
                Our automated health monitoring system has detected ${criticalIssues.length === 1 ? 'an issue' : 'issues'} with the insurance policy for <strong>${data.trust_name}</strong> that ${criticalIssues.length === 1 ? 'requires' : 'require'} immediate attention.
              </p>

              <!-- Health Score Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${data.overall_status === 'critical' ? '#f8d7da' : '#fff3cd'}; border-left: 4px solid ${statusColor}; border-radius: 4px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-weight: 600; color: #333;">Overall Status:</span>
                          <span style="float: right; font-weight: 700; color: ${statusColor};">${statusText}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid ${statusColor}33;">
                          <span style="font-weight: 600; color: #333;">Health Score:</span>
                          <span style="float: right; font-size: 18px; font-weight: 700; color: ${statusColor};">${data.health_score.toFixed(1)}/100</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid ${statusColor}33;">
                          <span style="font-weight: 600; color: #333;">Check Date:</span>
                          <span style="float: right; color: #666;">${checkDate}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Policy Details -->
              <h2 style="color: #333; font-size: 18px; margin: 30px 0 15px 0; font-weight: 600;">Policy Information</h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 4px; margin: 15px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-weight: 600; color: #333;">Policy Number:</span>
                          <span style="float: right; color: #666;">${data.policy_number}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-top: 1px solid #e0e0e0;">
                          <span style="font-weight: 600; color: #333;">Carrier:</span>
                          <span style="float: right; color: #666;">${data.carrier}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Issues Detected -->
              <h2 style="color: #dc3545; font-size: 18px; margin: 30px 0 15px 0; font-weight: 600;">Issues Detected</h2>

              ${criticalIssues.map(issue => `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff; border-left: 4px solid ${severityColors[issue.severity]}; border-radius: 4px; margin: 10px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0 0 5px 0; font-weight: 700; color: ${severityColors[issue.severity]}; text-transform: uppercase; font-size: 12px;">${issue.severity} SEVERITY</p>
                    <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.5;">${issue.description}</p>
                  </td>
                </tr>
              </table>
              `).join('')}

              <!-- Remediation Actions -->
              <h2 style="color: #333; font-size: 18px; margin: 30px 0 15px 0; font-weight: 600;">Required Actions</h2>

              <p style="margin: 0 0 15px 0; font-size: 15px; color: #666;">
                The following remediation actions have been created and assigned. Please review and complete each action by the specified due date.
              </p>

              ${data.remediation_actions.map(action => {
                const dueDate = new Date(action.due_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const urgencyLabel = action.days_until_due <= 3 ? 'URGENT' : action.days_until_due <= 7 ? 'SOON' : '';

                return `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-left: 4px solid ${priorityColors[action.priority]}; border-radius: 4px; margin: 15px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td colspan="2">
                          <span style="display: inline-block; padding: 3px 8px; background-color: ${priorityColors[action.priority]}; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; border-radius: 3px; margin-bottom: 8px;">${action.priority} PRIORITY</span>
                          ${urgencyLabel ? `<span style="display: inline-block; padding: 3px 8px; background-color: #dc3545; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; border-radius: 3px; margin-left: 5px; margin-bottom: 8px;">${urgencyLabel}</span>` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 5px 0;">
                          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #333;">${action.title}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-size: 14px; color: #666;">Due Date:</span>
                        </td>
                        <td style="text-align: right; padding: 8px 0;">
                          <span style="font-size: 14px; font-weight: 600; color: ${action.days_until_due <= 3 ? '#dc3545' : '#333'};">${dueDate} (${action.days_until_due} days)</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
                `;
              }).join('')}

              <!-- Next Steps -->
              <h3 style="color: #333; font-size: 16px; margin: 25px 0 10px 0; font-weight: 600;">Next Steps:</h3>

              <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                <li>Review each remediation action carefully</li>
                <li>Prioritize urgent and high-priority items</li>
                <li>Complete actions before their due dates</li>
                <li>Update action status in TrustFlow360 as you complete them</li>
                <li>Contact your insurance advisor if you need assistance</li>
              </ul>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  <td align="center">
                    <a href="https://trustflow360.com/dashboard" style="display: inline-block; padding: 12px 30px; background-color: #667eea; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 5px;">View in TrustFlow360</a>
                  </td>
                </tr>
              </table>

              <!-- Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0 0 0; padding: 20px 0; border-top: 1px solid #e0e0e0;">
                <tr>
                  <td style="font-size: 13px; color: #666; line-height: 1.6;">
                    <strong>Note:</strong> This is an automated alert from our AI-powered health monitoring system. The system continuously analyzes policy health based on premium payments, coverage adequacy, and compliance factors. Please take action on critical and urgent items promptly.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 5px 0; color: #999; font-size: 12px;">TrustFlow360 ILIT Administration Platform</p>
              <p style="margin: 0; color: #999; font-size: 12px;">Policy Health Alert for ${data.trust_name}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateRemediationAlertText(data: RemediationAlertData): string {
  const statusText = data.overall_status.toUpperCase();
  const checkDate = new Date(data.check_date).toLocaleDateString('en-US');

  // Filter critical/high severity issues
  const criticalIssues = data.issues.filter(i =>
    i.severity === 'critical' || i.severity === 'high'
  );

  return `
*** POLICY HEALTH ALERT ***
ACTION REQUIRED

${data.trust_name}

Dear ${data.trustee_name},

Our automated health monitoring system has detected ${criticalIssues.length === 1 ? 'an issue' : 'issues'} with the insurance policy for ${data.trust_name} that ${criticalIssues.length === 1 ? 'requires' : 'require'} immediate attention.

HEALTH STATUS:
- Overall Status: ${statusText}
- Health Score: ${data.health_score.toFixed(1)}/100
- Check Date: ${checkDate}

POLICY INFORMATION:
- Policy Number: ${data.policy_number}
- Carrier: ${data.carrier}

ISSUES DETECTED:
${criticalIssues.map((issue, idx) => `
${idx + 1}. [${issue.severity.toUpperCase()} SEVERITY]
   ${issue.description}
`).join('')}

REQUIRED ACTIONS:
The following remediation actions have been created and assigned. Please review and complete each action by the specified due date.

${data.remediation_actions.map((action, idx) => {
  const dueDate = new Date(action.due_date).toLocaleDateString('en-US');
  const urgencyLabel = action.days_until_due <= 3 ? ' *** URGENT ***' : action.days_until_due <= 7 ? ' ** SOON **' : '';

  return `
${idx + 1}. [${action.priority.toUpperCase()} PRIORITY]${urgencyLabel}
   ${action.title}
   Due: ${dueDate} (${action.days_until_due} days)
  `;
}).join('')}

NEXT STEPS:
1. Review each remediation action carefully
2. Prioritize urgent and high-priority items
3. Complete actions before their due dates
4. Update action status in TrustFlow360 as you complete them
5. Contact your insurance advisor if you need assistance

View in TrustFlow360: https://trustflow360.com/dashboard

NOTE:
This is an automated alert from our AI-powered health monitoring system. The system continuously analyzes policy health based on premium payments, coverage adequacy, and compliance factors. Please take action on critical and urgent items promptly.

---
TrustFlow360 ILIT Administration Platform
Policy Health Alert for ${data.trust_name}
  `.trim();
}
