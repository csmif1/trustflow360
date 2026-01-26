import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface PaymentSummaryRequest {
  start_date?: string;
  end_date?: string;
  trust_id?: string;
  policy_id?: string;
  export_format?: 'json' | 'csv';
}

interface PaymentRecord {
  payment_id: string;
  payment_date: string;
  policy_number: string;
  trust_name: string;
  grantor_name: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  notes?: string;
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
    const body: PaymentSummaryRequest = await req.json();
    const {
      start_date,
      end_date,
      trust_id,
      policy_id,
      export_format = 'json'
    } = body;

    // Build query
    let query = supabase
      .from('premium_payments')
      .select(`
        id,
        payment_date,
        amount,
        payment_method,
        payment_status,
        notes,
        insurance_policies!inner (
          id,
          policy_number,
          trusts!inner (
            id,
            trust_name,
            grantor_name
          )
        )
      `)
      .order('payment_date', { ascending: false });

    // Apply filters
    if (start_date) {
      query = query.gte('payment_date', start_date);
    }

    if (end_date) {
      query = query.lte('payment_date', end_date);
    }

    if (policy_id) {
      query = query.eq('policy_id', policy_id);
    }

    // Execute query
    const { data: payments, error } = await query;

    if (error) {
      console.error('Error fetching premium payments:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch premium payments', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform data
    const paymentRecords: PaymentRecord[] = payments.map((payment: any) => ({
      payment_id: payment.id,
      payment_date: payment.payment_date,
      policy_number: payment.insurance_policies?.policy_number || 'N/A',
      trust_name: payment.insurance_policies?.trusts?.trust_name || 'N/A',
      grantor_name: payment.insurance_policies?.trusts?.grantor_name || 'N/A',
      amount: payment.amount,
      payment_method: payment.payment_method || 'N/A',
      payment_status: payment.payment_status || 'completed',
      notes: payment.notes
    }));

    // Filter by trust_id if provided (after join)
    let filteredRecords = paymentRecords;
    if (trust_id) {
      const { data: trustPolicies } = await supabase
        .from('insurance_policies')
        .select('id')
        .eq('trust_id', trust_id);

      const policyIds = new Set(trustPolicies?.map(p => p.id) || []);
      filteredRecords = paymentRecords.filter(r =>
        payments.find(p => p.id === r.payment_id && policyIds.has(p.policy_id))
      );
    }

    // Calculate summary statistics
    const totalAmount = filteredRecords.reduce((sum, record) => sum + record.amount, 0);
    const paymentCount = filteredRecords.length;
    const avgPayment = paymentCount > 0 ? totalAmount / paymentCount : 0;

    const summary = {
      total_amount: totalAmount,
      payment_count: paymentCount,
      average_payment: avgPayment,
      date_range: {
        start: start_date || 'all time',
        end: end_date || 'present'
      },
      filters_applied: {
        trust_id: trust_id || null,
        policy_id: policy_id || null
      }
    };

    // Handle export format
    if (export_format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Payment Date',
        'Policy Number',
        'Trust Name',
        'Grantor Name',
        'Amount',
        'Payment Method',
        'Status',
        'Notes'
      ].join(',');

      const csvRows = filteredRecords.map(record =>
        [
          record.payment_date,
          record.policy_number,
          `"${record.trust_name}"`,
          `"${record.grantor_name}"`,
          record.amount.toFixed(2),
          record.payment_method,
          record.payment_status,
          `"${record.notes || ''}"`
        ].join(',')
      );

      const csv = [csvHeaders, ...csvRows].join('\n');

      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="premium-payments-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Return JSON response
    return new Response(
      JSON.stringify({
        success: true,
        summary,
        payments: filteredRecords,
        generated_at: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in premium-payment-summary:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
