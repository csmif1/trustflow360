import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const ANNUAL_EXCLUSION_2026 = 19000;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

interface GiftRequestData {
  trust_id: string;
  policy_id: string;
  grantor_name: string;
  grantor_email?: string;
  amount_requested: number;
  premium_due_date?: string;
  request_due_date?: string;
  custom_message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ENDPOINT 1: Calculate recommended gift amount
    if (path.includes('/calculate') && req.method === 'GET') {
      const policyId = url.searchParams.get('policy_id');

      if (!policyId) {
        return new Response(
          JSON.stringify({ error: 'policy_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch policy and trust data
      const { data: policy, error: policyError } = await supabase
        .from('insurance_policies')
        .select(`
          id,
          policy_number,
          annual_premium,
          carrier,
          next_premium_date,
          trust_id
        `)
        .eq('id', policyId)
        .single();

      if (policyError || !policy) {
        return new Response(
          JSON.stringify({ error: 'Policy not found', details: policyError?.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch trust data separately
      const { data: trust, error: trustError } = await supabase
        .from('trusts')
        .select('id, trust_name, grantor_name, grantor_email')
        .eq('id', policy.trust_id)
        .single();

      if (trustError || !trust) {
        return new Response(
          JSON.stringify({ error: 'Trust not found', details: trustError?.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch beneficiaries
      const { data: beneficiaries, error: benError } = await supabase
        .from('beneficiaries')
        .select('id')
        .eq('trust_id', policy.trust_id);

      // Count grantors (for now assuming 1, can be enhanced)
      const numberOfGrantors = 1;
      const numberOfBeneficiaries = beneficiaries?.length || 1;
      const premiumAmount = policy.annual_premium || 0;

      // Calculate base request: Premium ÷ Number of Grantors
      const baseRequest = premiumAmount / numberOfGrantors;

      // Check against annual exclusion
      const maxPerGrantor = ANNUAL_EXCLUSION_2026 * numberOfBeneficiaries;
      const needsGiftTaxFiling = baseRequest > maxPerGrantor;

      // Calculate request due date (30 days before premium due)
      let requestDueDate = null;
      if (policy.next_premium_date) {
        const premiumDate = new Date(policy.next_premium_date);
        const dueDate = new Date(premiumDate);
        dueDate.setDate(premiumDate.getDate() - 30);
        requestDueDate = dueDate.toISOString().split('T')[0];
      }

      return new Response(
        JSON.stringify({
          success: true,
          calculation: {
            premium_amount: premiumAmount,
            number_of_grantors: numberOfGrantors,
            number_of_beneficiaries: numberOfBeneficiaries,
            recommended_amount: baseRequest,
            annual_exclusion_limit: ANNUAL_EXCLUSION_2026,
            max_per_grantor: maxPerGrantor,
            needs_gift_tax_filing: needsGiftTaxFiling,
            premium_due_date: policy.next_premium_date,
            recommended_request_due_date: requestDueDate
          },
          policy: {
            policy_number: policy.policy_number,
            carrier_name: policy.carrier,
            trust_name: trust.trust_name,
            grantor_name: trust.grantor_name,
            grantor_email: trust.grantor_email
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ENDPOINT 2: Generate gift request letter HTML
    if (path.includes('/generate') && req.method === 'POST') {
      const body: GiftRequestData = await req.json();

      // Fetch policy details
      const { data: policy, error: policyError } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('id', body.policy_id)
        .single();

      if (policyError || !policy) {
        return new Response(
          JSON.stringify({ error: 'Policy not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch trust details
      const { data: trust, error: trustError } = await supabase
        .from('trusts')
        .select('*')
        .eq('id', policy.trust_id)
        .single();

      if (trustError || !trust) {
        return new Response(
          JSON.stringify({ error: 'Trust not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch beneficiaries
      const { data: beneficiaries, error: benError } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('trust_id', policy.trust_id);

      const letterHtml = generateLetterHTML({
        trustName: trust.trust_name,
        grantorName: body.grantor_name,
        policyNumber: policy.policy_number,
        carrierName: policy.carrier || 'Insurance Carrier',
        premiumAmount: policy.annual_premium || 0,
        premiumDueDate: body.premium_due_date || policy.next_premium_date || '',
        requestedAmount: body.amount_requested,
        numberOfBeneficiaries: beneficiaries?.length || 0,
        requestDueDate: body.request_due_date || '',
        customMessage: body.custom_message || '',
        trusteeContact: 'TrustFlow360 Admin' // Could be enhanced with actual trustee info
      });

      // Save the request to database
      const { data: savedRequest, error: saveError } = await supabase
        .from('gift_requests')
        .insert({
          trust_id: body.trust_id,
          policy_id: body.policy_id,
          grantor_name: body.grantor_name,
          grantor_email: body.grantor_email,
          amount_requested: body.amount_requested,
          premium_due_date: body.premium_due_date,
          request_due_date: body.request_due_date,
          status: 'draft',
          letter_html: letterHtml
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving gift request:', saveError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          letter_html: letterHtml,
          request_id: savedRequest?.id || null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ENDPOINT 3: Send gift request via email
    if (path.includes('/send') && req.method === 'POST') {
      const body: { request_id: string; send_via: 'email' | 'mail' | 'both' } = await req.json();

      // Fetch the gift request
      const { data: request, error: requestError } = await supabase
        .from('gift_requests')
        .select('*')
        .eq('id', body.request_id)
        .single();

      if (requestError || !request) {
        return new Response(
          JSON.stringify({ error: 'Gift request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let emailSent = false;

      // Send via email if requested
      if ((body.send_via === 'email' || body.send_via === 'both') && request.grantor_email) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'TrustFlow360 <noreply@trustflow360.com>',
              to: [request.grantor_email],
              subject: `Gift Contribution Request - ${request.grantor_name}`,
              html: request.letter_html
            })
          });

          if (emailResponse.ok) {
            emailSent = true;
          } else {
            const errorData = await emailResponse.json();
            console.error('Resend error:', errorData);
          }
        } catch (error) {
          console.error('Email send error:', error);
        }
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('gift_requests')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_via: body.send_via
        })
        .eq('id', body.request_id);

      if (updateError) {
        console.error('Error updating gift request:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          email_sent: emailSent,
          send_via: body.send_via,
          message: emailSent
            ? 'Gift request sent successfully via email'
            : body.send_via === 'mail'
            ? 'Gift request marked as sent via mail'
            : 'Gift request updated'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default response for unknown endpoints
    return new Response(
      JSON.stringify({ error: 'Endpoint not found. Use /calculate, /generate, or /send' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate professional HTML letter
function generateLetterHTML(data: {
  trustName: string;
  grantorName: string;
  policyNumber: string;
  carrierName: string;
  premiumAmount: number;
  premiumDueDate: string;
  requestedAmount: number;
  numberOfBeneficiaries: number;
  requestDueDate: string;
  customMessage: string;
  trusteeContact: string;
}): string {
  const formattedPremiumAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(data.premiumAmount);

  const formattedRequestedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(data.requestedAmount);

  const formattedPremiumDate = data.premiumDueDate
    ? new Date(data.premiumDueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'TBD';

  const formattedRequestDate = data.requestDueDate
    ? new Date(data.requestDueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'at your earliest convenience';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Georgia', serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 650px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .letterhead {
      border-bottom: 2px solid #1a4971;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .letterhead h1 {
      color: #1a4971;
      font-size: 24px;
      margin: 0 0 10px 0;
    }
    .letterhead p {
      color: #6b7280;
      margin: 0;
      font-size: 14px;
    }
    .date {
      text-align: right;
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .greeting {
      margin-bottom: 20px;
    }
    .content {
      margin-bottom: 20px;
    }
    .details-box {
      background-color: #f3f4f6;
      border-left: 4px solid #1a4971;
      padding: 20px;
      margin: 25px 0;
    }
    .details-box h3 {
      margin-top: 0;
      color: #1a4971;
      font-size: 16px;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .details-row:last-child {
      border-bottom: none;
    }
    .details-label {
      font-weight: 600;
      color: #4b5563;
    }
    .details-value {
      color: #1f2937;
    }
    .amount-highlight {
      font-size: 20px;
      font-weight: bold;
      color: #059669;
    }
    .closing {
      margin-top: 40px;
    }
    .signature {
      margin-top: 50px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="letterhead">
    <h1>TrustFlow360</h1>
    <p>Premium Vigilance Dashboard • ILIT Administration</p>
  </div>

  <div class="date">
    ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>

  <div class="greeting">
    <p>Dear ${data.grantorName},</p>
  </div>

  <div class="content">
    <p>
      As trustee of the <strong>${data.trustName}</strong>, I am writing to request a gift contribution
      to fund the upcoming insurance premium payment.
    </p>

    <div class="details-box">
      <h3>Premium Payment Details</h3>
      <div class="details-row">
        <span class="details-label">Policy Number:</span>
        <span class="details-value">${data.policyNumber}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Insurance Carrier:</span>
        <span class="details-value">${data.carrierName}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Premium Amount:</span>
        <span class="details-value">${formattedPremiumAmount}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Premium Due Date:</span>
        <span class="details-value">${formattedPremiumDate}</span>
      </div>
      <div class="details-row">
        <span class="details-label">Number of Beneficiaries:</span>
        <span class="details-value">${data.numberOfBeneficiaries}</span>
      </div>
    </div>

    <p>
      <strong>Requested Contribution:</strong>
      <span class="amount-highlight">${formattedRequestedAmount}</span>
    </p>

    <p>
      To ensure timely payment of the premium, we kindly request that you make your contribution
      by <strong>${formattedRequestDate}</strong>.
    </p>

    ${data.customMessage ? `
    <p>${data.customMessage}</p>
    ` : ''}

    <p>
      Upon receipt of your contribution, we will issue Crummey withdrawal rights notices to all
      beneficiaries in accordance with IRS requirements. This will preserve the gift tax annual
      exclusion for your contribution.
    </p>

    <p>
      <strong>Payment Instructions:</strong><br>
      Please make checks payable to "<strong>${data.trustName}</strong>" and mail to the address below.
      Alternatively, wire transfer instructions are available upon request.
    </p>
  </div>

  <div class="closing">
    <p>
      Thank you for your continued support of the trust. Please don't hesitate to contact me
      if you have any questions.
    </p>
    <p>Sincerely,</p>
  </div>

  <div class="signature">
    <p><strong>${data.trusteeContact}</strong><br>
    Trustee</p>
  </div>

  <div class="footer">
    <p>This letter was generated by TrustFlow360 Premium Vigilance Dashboard</p>
    <p>For questions or assistance, please contact your trustee</p>
  </div>
</body>
</html>
  `;
}
