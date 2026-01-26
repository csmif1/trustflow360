import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  generateDeadlineAlertHTML,
  generateDeadlineAlertText,
  type DeadlineAlertData
} from '../_shared/email-templates.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface AlertInput {
  window_days?: number;
}

function validateAlertInput(body: any): { valid: boolean; error?: string; data?: { window_days: number } } {
  // Check if window_days is provided
  if (body.window_days !== undefined && body.window_days !== null) {
    if (typeof body.window_days !== 'number' || body.window_days <= 0) {
      return { valid: false, error: 'window_days must be a positive number' };
    }
  }

  const windowDays = body.window_days ?? 7; // Default 7 days

  return { valid: true, data: { window_days: windowDays } };
}

async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return {
        success: false,
        error: 'Resend API key not configured',
      };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'TrustFlow360 <onboarding@resend.dev>',
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
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
      id: result.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email',
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json().catch(() => ({}));

    // Validate input
    const validation = validateAlertInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { window_days } = validation.data!;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + window_days);

    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // Fetch all notices with notice_status 'sent' that expire within the window
    const { data: sentNotices, error: fetchError } = await supabase
      .from('crummey_notices')
      .select(`
        id,
        gift_id,
        beneficiary_id,
        withdrawal_deadline,
        withdrawal_amount,
        notice_date,
        gifts!inner(ilit_id, ilits!inner(trust_id, trustee_name, trustee_email))
      `)
      .eq('notice_status', 'sent')
      .gt('withdrawal_deadline', todayStr)
      .lte('withdrawal_deadline', futureDateStr)

    if (fetchError) {
      console.error('Error fetching notices:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notices' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalChecked = 0;
    let alertsSent = 0;
    let alertsSkipped = 0;
    const alertResults: any[] = [];

    // Process each notice
    for (const notice of sentNotices || []) {
      totalChecked++;

      // Check if alert already sent for this notice
      const { data: existingAlerts } = await supabase
        .from('email_logs')
        .select('id')
        .eq('notice_id', notice.id)
        .like('subject', '%Deadline Alert%')
        .limit(1)

      if (existingAlerts && existingAlerts.length > 0) {
        alertsSkipped++;
        continue;
      }

      // Fetch beneficiary details
      const { data: beneficiary, error: beneficiaryError } = await supabase
        .from('beneficiaries')
        .select('id, name, email')
        .eq('id', notice.beneficiary_id)
        .single()

      if (beneficiaryError || !beneficiary) {
        console.error(`Beneficiary not found for notice ${notice.id}`);
        alertsSkipped++;
        continue;
      }

      // Extract trust info from joined data
      const ilit = notice.gifts?.ilits;
      if (!ilit) {
        console.error(`ILIT not found for notice ${notice.id}`);
        alertsSkipped++;
        continue;
      }

      if (!ilit.trustee_email) {
        console.error(`Trustee has no email for notice ${notice.id}`);
        alertsSkipped++;
        continue;
      }

      // Calculate days remaining
      const deadline = new Date(notice.withdrawal_deadline);
      const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Generate alert email content
      const emailData: DeadlineAlertData = {
        trustee_name: ilit.trustee_name,
        beneficiary_name: beneficiary.name,
        trust_name: ilit.trust_id,
        withdrawal_amount: parseFloat(notice.withdrawal_amount),
        withdrawal_deadline: notice.withdrawal_deadline,
        days_remaining: daysRemaining,
        notice_sent_date: notice.notice_date
      };

      const subject = `Crummey Notice Deadline Alert - ${ilit.trust_id} - ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''} Remaining`;
      const htmlContent = generateDeadlineAlertHTML(emailData);
      const textContent = generateDeadlineAlertText(emailData);

      // Send email to trustee
      const sendResult = await sendViaResend({
        to: ilit.trustee_email,
        subject,
        html: htmlContent,
        text: textContent
      });

      // Create email log
      const emailLogData = {
        notice_id: notice.id,
        recipient_email: ilit.trustee_email,
        recipient_name: ilit.trustee_name,
        subject,
        html_content: htmlContent,
        sent_at: sendResult.success ? new Date().toISOString() : null,
        delivery_method: sendResult.success ? 'resend' : 'failed'
      };

      await supabase
        .from('email_logs')
        .insert(emailLogData)

      if (sendResult.success) {
        alertsSent++;
        alertResults.push({
          notice_id: notice.id,
          trustee_email: ilit.trustee_email,
          days_remaining: daysRemaining,
          email_service_id: sendResult.id
        });
      } else {
        alertsSkipped++;
        console.error(`Failed to send alert for notice ${notice.id}:`, sendResult.error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_checked: totalChecked,
        alerts_sent: alertsSent,
        alerts_skipped: alertsSkipped,
        window_days: window_days,
        alert_results: alertResults,
        execution_timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-deadline-alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
