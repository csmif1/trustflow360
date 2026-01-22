import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  generateCrummeyNoticeHTML,
  generateCrummeyNoticeText,
  type CrummeyNoticeData
} from '../_shared/email-templates.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NoticeInput {
  notice_id: string;
}

function validateNoticeInput(body: any): { valid: boolean; error?: string; data?: NoticeInput } {
  if (!body.notice_id) {
    return { valid: false, error: 'Missing required field: notice_id' };
  }

  return { valid: true, data: body as NoticeInput };
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
        from: 'TrustFlow360 <notices@trustflow360.com>',
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

    const body = await req.json()

    // Validate input
    const validation = validateNoticeInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { notice_id } = validation.data!;

    // Fetch notice details with trust info via gift relationship
    const { data: notice, error: noticeError } = await supabase
      .from('crummey_notices')
      .select(`
        id,
        beneficiary_id,
        gift_id,
        notice_date,
        withdrawal_deadline,
        withdrawal_amount,
        notice_status,
        gifts!inner(trust_id)
      `)
      .eq('id', notice_id)
      .single()

    if (noticeError || !notice) {
      return new Response(
        JSON.stringify({ error: 'Notice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already sent
    if (notice.notice_status === 'sent') {
      return new Response(
        JSON.stringify({
          error: 'Notice already sent',
          details: 'This notice has already been sent to the beneficiary'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch beneficiary details
    const { data: beneficiary, error: beneficiaryError } = await supabase
      .from('beneficiaries')
      .select('id, name, email')
      .eq('id', notice.beneficiary_id)
      .single()

    if (beneficiaryError || !beneficiary) {
      return new Response(
        JSON.stringify({ error: 'Beneficiary not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!beneficiary.email) {
      return new Response(
        JSON.stringify({
          error: 'Beneficiary has no email address',
          details: 'Cannot send notice without beneficiary email'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch trust details
    const { data: trust, error: trustError } = await supabase
      .from('trusts')
      .select('id, trust_name, trustee_name, trustee_email')
      .eq('id', notice.gifts?.trust_id)
      .single()

    if (trustError || !trust) {
      return new Response(
        JSON.stringify({ error: 'Trust not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate withdrawal period days from dates
    const noticeDate = new Date(notice.notice_date);
    const deadlineDate = new Date(notice.withdrawal_deadline);
    const withdrawalPeriodDays = Math.ceil((deadlineDate.getTime() - noticeDate.getTime()) / (1000 * 60 * 60 * 24));

    // Generate email content
    const emailData: CrummeyNoticeData = {
      beneficiary_name: beneficiary.name,
      trust_name: trust.trust_name,
      withdrawal_amount: parseFloat(notice.withdrawal_amount),
      notice_date: notice.notice_date,
      withdrawal_deadline: notice.withdrawal_deadline,
      withdrawal_period_days: withdrawalPeriodDays || 30,
      trustee_name: trust.trustee_name,
      trustee_email: trust.trustee_email
    };

    const subject = `Crummey Notice - ${trust.trust_name} - Withdrawal Rights`;
    const htmlContent = generateCrummeyNoticeHTML(emailData);
    const textContent = generateCrummeyNoticeText(emailData);

    // Send email via Resend
    const sendResult = await sendViaResend({
      to: beneficiary.email,
      subject,
      html: htmlContent,
      text: textContent
    });

    // Create email log
    const emailLogData = {
      recipient_email: beneficiary.email,
      recipient_name: beneficiary.name,
      subject,
      trust_id: notice.gifts?.trust_id || null,
      crummey_notice_id: notice_id,
      status: sendResult.success ? 'sent' : 'failed',
      sent_at: sendResult.success ? new Date().toISOString() : null,
      error_message: sendResult.error || null,
      email_service_id: sendResult.id || null,
      retry_count: 0
    };

    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .insert(emailLogData)
      .select()
      .single()

    if (logError) {
      console.error('Error creating email log:', logError);
    }

    // If email sending failed, update notice_status to failed
    if (!sendResult.success) {
      await supabase
        .from('crummey_notices')
        .update({
          notice_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', notice_id)

      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          details: sendResult.error,
          email_log_id: emailLog?.id
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update notice_status to sent
    const { data: updatedNotice, error: updateError } = await supabase
      .from('crummey_notices')
      .update({
        notice_status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notice_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating notice_status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Crummey notice generated and sent successfully',
        notice: updatedNotice,
        email_log_id: emailLog?.id,
        email_service_id: sendResult.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-crummey-notice:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
