import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

interface AssignActionRequest {
  action_id: string;
  assigned_to_email: string;
  assigned_to_name: string;
  assigned_by_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: AssignActionRequest = await req.json();

    if (!body.action_id || !body.assigned_to_email || !body.assigned_to_name) {
      return new Response(
        JSON.stringify({ error: 'action_id, assigned_to_email, and assigned_to_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the remediation action with policy and trust details
    const { data: action, error: actionError } = await supabase
      .from('remediation_actions')
      .select(`
        id,
        action_type,
        priority,
        description,
        status,
        due_date,
        policy_id,
        insurance_policies!inner (
          policy_number,
          carrier_name,
          trusts!inner (
            trust_name
          )
        )
      `)
      .eq('id', body.action_id)
      .single();

    if (actionError || !action) {
      return new Response(
        JSON.stringify({ error: 'Remediation action not found', details: actionError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the action with assignment information
    const { data: updatedAction, error: updateError } = await supabase
      .from('remediation_actions')
      .update({
        assigned_to_email: body.assigned_to_email,
        assigned_to_name: body.assigned_to_name,
        assigned_at: new Date().toISOString(),
        assigned_by: body.assigned_by_id || null
      })
      .eq('id', body.action_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating remediation action:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update action', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email notification via Resend
    let emailSent = false;
    try {
      const emailHtml = generateAssignmentEmail({
        actionType: action.action_type,
        priority: action.priority,
        description: action.description,
        dueDate: action.due_date,
        policyNumber: action.insurance_policies.policy_number,
        carrierName: action.insurance_policies.carrier_name,
        trustName: action.insurance_policies.trusts.trust_name,
        assigneeName: body.assigned_to_name
      });

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'TrustFlow360 <noreply@trustflow360.com>',
          to: [body.assigned_to_email],
          subject: `TrustFlow360: Action Assigned - ${action.action_type}`,
          html: emailHtml
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

    return new Response(
      JSON.stringify({
        success: true,
        action: updatedAction,
        email_sent: emailSent,
        message: emailSent
          ? 'Action assigned and notification sent'
          : 'Action assigned (email notification failed)'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate professional HTML email for action assignment
function generateAssignmentEmail(data: {
  actionType: string;
  priority: string;
  description: string;
  dueDate: string | null;
  policyNumber: string;
  carrierName: string;
  trustName: string;
  assigneeName: string;
}): string {
  const formattedDueDate = data.dueDate
    ? new Date(data.dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'No due date set';

  const priorityColor = data.priority === 'high' ? '#dc2626' :
                        data.priority === 'medium' ? '#f59e0b' : '#10b981';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1a4971 0%, #2563eb 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 30px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .action-card {
      background: #f9fafb;
      border-left: 4px solid ${priorityColor};
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .action-card h3 {
      margin-top: 0;
      color: #1a4971;
      font-size: 18px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #6b7280;
    }
    .detail-value {
      color: #1f2937;
    }
    .priority-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      background-color: ${priorityColor};
      color: white;
    }
    .cta-button {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>TrustFlow360</h1>
    <p>Premium Vigilance Dashboard</p>
  </div>

  <div class="content">
    <p class="greeting">Dear ${data.assigneeName},</p>

    <p>
      A new remediation action has been assigned to you. Please review the details below and take
      appropriate action by the due date.
    </p>

    <div class="action-card">
      <h3>${data.actionType}</h3>

      <div class="detail-row">
        <span class="detail-label">Priority:</span>
        <span class="priority-badge">${data.priority}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Trust:</span>
        <span class="detail-value">${data.trustName}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Policy Number:</span>
        <span class="detail-value">${data.policyNumber}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Carrier:</span>
        <span class="detail-value">${data.carrierName}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Due Date:</span>
        <span class="detail-value">${formattedDueDate}</span>
      </div>
    </div>

    <p><strong>Description:</strong></p>
    <p style="background: #f9fafb; padding: 15px; border-radius: 4px; margin: 10px 0;">
      ${data.description || 'No additional details provided.'}
    </p>

    <p style="margin-top: 30px;">
      Please log in to TrustFlow360 to view full details and update the action status.
    </p>

    <center>
      <a href="https://trustflow360.com/dashboard" class="cta-button">
        View in Dashboard
      </a>
    </center>
  </div>

  <div class="footer">
    <p>This is an automated notification from TrustFlow360 Premium Vigilance Dashboard</p>
    <p>If you have questions, please contact your team administrator</p>
  </div>
</body>
</html>
  `;
}
