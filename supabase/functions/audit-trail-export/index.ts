import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditTrailRequest {
  start_date?: string;
  end_date?: string;
  entity_type?: string; // 'policy_health', 'gift', 'crummey_notice', 'premium_payment', etc.
  entity_id?: string;
  export_format?: 'json' | 'csv';
}

interface AuditRecord {
  timestamp: string;
  entity_type: string;
  entity_id: string;
  action: string;
  model_name?: string;
  confidence_score?: number;
  success: boolean;
  details: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: AuditTrailRequest = await req.json();
    const {
      start_date,
      end_date,
      entity_type,
      entity_id,
      export_format = 'json'
    } = body;

    // Query ai_processing_log for audit trail
    let aiLogQuery = supabase
      .from('ai_processing_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (start_date) {
      aiLogQuery = aiLogQuery.gte('created_at', start_date);
    }

    if (end_date) {
      aiLogQuery = aiLogQuery.lte('created_at', end_date);
    }

    if (entity_type) {
      aiLogQuery = aiLogQuery.eq('entity_type', entity_type);
    }

    if (entity_id) {
      aiLogQuery = aiLogQuery.eq('entity_id', entity_id);
    }

    const { data: aiLogs, error: aiError } = await aiLogQuery;

    if (aiError) {
      console.error('Error fetching AI processing logs:', aiError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch audit trail', details: aiError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform AI logs into audit records
    const auditRecords: AuditRecord[] = aiLogs.map((log: any) => ({
      timestamp: log.created_at,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      action: determineAction(log.entity_type),
      model_name: log.model_name,
      confidence_score: log.confidence_score,
      success: log.success,
      details: formatDetails(log)
    }));

    // Query other activity logs (premium payments, gifts, crummey notices, etc.)
    const additionalRecords: AuditRecord[] = [];

    // Fetch premium payment activity
    if (!entity_type || entity_type === 'premium_payment') {
      let paymentQuery = supabase
        .from('premium_payments')
        .select(`
          created_at,
          id,
          payment_date,
          amount,
          payment_method,
          insurance_policies!inner (policy_number, trusts!inner (trust_name))
        `)
        .order('created_at', { ascending: false });

      if (start_date) paymentQuery = paymentQuery.gte('created_at', start_date);
      if (end_date) paymentQuery = paymentQuery.lte('created_at', end_date);

      const { data: payments } = await paymentQuery;

      payments?.forEach((payment: any) => {
        additionalRecords.push({
          timestamp: payment.created_at,
          entity_type: 'premium_payment',
          entity_id: payment.id,
          action: 'Premium payment recorded',
          success: true,
          details: `$${payment.amount} paid for policy ${payment.insurance_policies?.policy_number} (${payment.insurance_policies?.trusts?.trust_name})`
        });
      });
    }

    // Fetch gift activity
    if (!entity_type || entity_type === 'gift') {
      let giftQuery = supabase
        .from('gifts')
        .select(`
          created_at,
          id,
          gift_date,
          amount,
          trusts!inner (trust_name, grantor_name)
        `)
        .order('created_at', { ascending: false });

      if (start_date) giftQuery = giftQuery.gte('created_at', start_date);
      if (end_date) giftQuery = giftQuery.lte('created_at', end_date);

      const { data: gifts } = await giftQuery;

      gifts?.forEach((gift: any) => {
        additionalRecords.push({
          timestamp: gift.created_at,
          entity_type: 'gift',
          entity_id: gift.id,
          action: 'Gift recorded',
          success: true,
          details: `$${gift.amount} gift to ${gift.trusts?.trust_name} from ${gift.trusts?.grantor_name}`
        });
      });
    }

    // Fetch Crummey notice activity
    if (!entity_type || entity_type === 'crummey_notice') {
      let noticeQuery = supabase
        .from('crummey_notices')
        .select('created_at, id, notice_status, notice_date, withdrawal_deadline')
        .order('created_at', { ascending: false });

      if (start_date) noticeQuery = noticeQuery.gte('created_at', start_date);
      if (end_date) noticeQuery = noticeQuery.lte('created_at', end_date);

      const { data: notices } = await noticeQuery;

      notices?.forEach((notice: any) => {
        additionalRecords.push({
          timestamp: notice.created_at,
          entity_type: 'crummey_notice',
          entity_id: notice.id,
          action: `Crummey notice ${notice.notice_status}`,
          success: true,
          details: `Notice dated ${notice.notice_date}, withdrawal deadline ${notice.withdrawal_deadline}`
        });
      });
    }

    // Combine all records and sort by timestamp
    const allRecords = [...auditRecords, ...additionalRecords].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Calculate summary statistics
    const summary = {
      total_records: allRecords.length,
      ai_processed_records: auditRecords.length,
      manual_records: additionalRecords.length,
      success_rate: allRecords.filter(r => r.success).length / allRecords.length * 100,
      date_range: {
        start: start_date || 'all time',
        end: end_date || 'present'
      },
      filters_applied: {
        entity_type: entity_type || 'all',
        entity_id: entity_id || null
      }
    };

    // Handle CSV export
    if (export_format === 'csv') {
      const csvHeaders = [
        'Timestamp',
        'Entity Type',
        'Entity ID',
        'Action',
        'Model Name',
        'Confidence Score',
        'Success',
        'Details'
      ].join(',');

      const csvRows = allRecords.map(record =>
        [
          record.timestamp,
          record.entity_type,
          record.entity_id,
          `"${record.action}"`,
          record.model_name || 'N/A',
          record.confidence_score?.toFixed(2) || 'N/A',
          record.success ? 'Yes' : 'No',
          `"${record.details.replace(/"/g, '""')}"` // Escape quotes in details
        ].join(',')
      );

      const csv = [csvHeaders, ...csvRows].join('\n');

      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-trail-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Return JSON response
    return new Response(
      JSON.stringify({
        success: true,
        summary,
        records: allRecords,
        generated_at: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in audit-trail-export:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions
function determineAction(entityType: string): string {
  const actions: Record<string, string> = {
    'policy_health': 'AI health check performed',
    'gift': 'Gift processed',
    'crummey_notice': 'Crummey notice generated',
    'premium_payment': 'Premium payment processed',
    'document': 'Document processed',
    'beneficiary': 'Beneficiary updated'
  };

  return actions[entityType] || 'Action performed';
}

function formatDetails(log: any): string {
  const parts: string[] = [];

  if (log.ai_response) {
    try {
      const response = typeof log.ai_response === 'string'
        ? JSON.parse(log.ai_response)
        : log.ai_response;

      if (response.overall_status) {
        parts.push(`Status: ${response.overall_status}`);
      }

      if (response.summary) {
        parts.push(response.summary);
      }
    } catch (e) {
      parts.push(String(log.ai_response).substring(0, 100));
    }
  }

  if (log.model_name) {
    parts.push(`Model: ${log.model_name}`);
  }

  if (log.confidence_score) {
    parts.push(`Confidence: ${(log.confidence_score * 100).toFixed(1)}%`);
  }

  return parts.join(' | ') || 'No details available';
}
