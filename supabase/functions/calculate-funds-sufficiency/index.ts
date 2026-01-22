import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SufficiencyInput {
  trust_id: string;
  lookahead_days?: number;
}

function validateSufficiencyInput(body: any): { valid: boolean; error?: string; data?: SufficiencyInput } {
  if (!body.trust_id) {
    return { valid: false, error: 'Missing required field: trust_id' };
  }

  if (body.lookahead_days !== undefined && body.lookahead_days !== null) {
    if (typeof body.lookahead_days !== 'number' || body.lookahead_days < 1) {
      return { valid: false, error: 'lookahead_days must be a positive number' };
    }
  }

  return { valid: true, data: body as SufficiencyInput };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()

    const validation = validateSufficiencyInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { trust_id, lookahead_days = 90 } = validation.data!;

    const { data: trust, error: trustError } = await supabaseClient
      .from('trusts')
      .select('id')
      .eq('id', trust_id)
      .single()

    if (trustError || !trust) {
      return new Response(
        JSON.stringify({ error: 'Trust not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: gifts } = await supabaseClient
      .from('gifts')
      .select('amount')
      .eq('trust_id', trust_id)

    const totalGifts = (gifts || []).reduce((sum, gift) => sum + (Number(gift.amount) || 0), 0);

    const { data: policies } = await supabaseClient
      .from('insurance_policies')
      .select('id')
      .eq('trust_id', trust_id)

    const policyIds = (policies || []).map(p => p.id);
    
    let totalPaid = 0;
    if (policyIds.length > 0) {
      const { data: payments } = await supabaseClient
        .from('premium_payments')
        .select('amount')
        .in('policy_id', policyIds)

      totalPaid = (payments || []).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    }

    const availableFunds = totalGifts - totalPaid;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + lookahead_days);

    const { data: upcomingPolicies } = await supabaseClient
      .from('insurance_policies')
      .select('annual_premium, next_premium_due, premium_frequency')
      .eq('trust_id', trust_id)
      .gte('next_premium_due', today.toISOString().split('T')[0])
      .lte('next_premium_due', futureDate.toISOString().split('T')[0])

    const totalUpcomingPremiums = (upcomingPolicies || []).reduce((sum, policy) => {
      return sum + (Number(policy.annual_premium) || 0);
    }, 0);

    const isSufficient = availableFunds >= totalUpcomingPremiums;
    const shortfall = isSufficient ? 0 : totalUpcomingPremiums - availableFunds;

    const { data: checkRecord, error: checkError } = await supabaseClient
      .from('fund_sufficiency_checks')
      .insert({
        trust_id: trust_id,
        check_date: today.toISOString().split('T')[0],
        total_trust_assets: availableFunds,
        total_annual_premiums: totalUpcomingPremiums,
        is_sufficient: isSufficient,
        shortfall_amount: shortfall,
        sufficiency_ratio: totalUpcomingPremiums > 0 ? (availableFunds / totalUpcomingPremiums) : null,
        months_of_coverage: totalUpcomingPremiums > 0 ? Math.floor((availableFunds / totalUpcomingPremiums) * 12) : null
      })
      .select()
      .single()

    if (checkError) {
      console.error('Error storing sufficiency check:', checkError);
    }

    const shortfallFixed = shortfall.toFixed(2);
    const message = isSufficient 
      ? 'Sufficient funds available for upcoming premiums' 
      : 'Shortfall of ' + shortfallFixed + ' for upcoming premiums';

    return new Response(
      JSON.stringify({
        success: true,
        is_sufficient: isSufficient,
        available_funds: availableFunds,
        required_funds: totalUpcomingPremiums,
        shortfall: shortfall,
        lookahead_days: lookahead_days,
        check_id: checkRecord?.id,
        message: message
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in calculate-funds-sufficiency:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
