import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentInput {
  policy_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  gift_id?: string;
  confirmation_number?: string;
  notes?: string;
}

function validatePaymentInput(body: any): { valid: boolean; error?: string; data?: PaymentInput } {
  if (!body.policy_id) {
    return { valid: false, error: 'Missing required field: policy_id' };
  }
  if (body.amount === undefined || body.amount === null) {
    return { valid: false, error: 'Missing required field: amount' };
  }
  if (!body.payment_date) {
    return { valid: false, error: 'Missing required field: payment_date' };
  }

  if (typeof body.amount !== 'number' || body.amount <= 0) {
    return { valid: false, error: 'amount must be a positive number' };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(body.payment_date)) {
    return { valid: false, error: 'payment_date must be in YYYY-MM-DD format' };
  }

  const paymentDate = new Date(body.payment_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (paymentDate > today) {
    return { valid: false, error: 'payment_date cannot be in the future' };
  }

  return { valid: true, data: body as PaymentInput };
}

function calculateNextPremiumDue(currentDue: string | null, frequency: string): string {
  const current = currentDue ? new Date(currentDue) : new Date();

  switch (frequency) {
    case 'monthly':
      current.setMonth(current.getMonth() + 1);
      break;
    case 'quarterly':
      current.setMonth(current.getMonth() + 3);
      break;
    case 'semi-annual':
      current.setMonth(current.getMonth() + 6);
      break;
    case 'annual':
    default:
      current.setFullYear(current.getFullYear() + 1);
      break;
  }

  return current.toISOString().split('T')[0];
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

    const validation = validatePaymentInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paymentData = validation.data!;

    const { data: policy, error: policyError } = await supabaseClient
      .from('insurance_policies')
      .select('id, premium_frequency, next_premium_due')
      .eq('id', paymentData.policy_id)
      .single()

    if (policyError || !policy) {
      return new Response(
        JSON.stringify({ error: 'Policy not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (paymentData.gift_id) {
      const { data: gift, error: giftError } = await supabaseClient
        .from('gifts')
        .select('id')
        .eq('id', paymentData.gift_id)
        .single()

      if (giftError || !gift) {
        return new Response(
          JSON.stringify({ error: 'Gift not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { data: payment, error: paymentError } = await supabaseClient
      .from('premium_payments')
      .insert({
        policy_id: paymentData.policy_id,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        gift_id: paymentData.gift_id,
        confirmation_number: paymentData.confirmation_number,
        notes: paymentData.notes,
        paid_from_trust: true,
        status: 'completed'
      })
      .select()
      .single()

    if (paymentError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const nextPremiumDue = calculateNextPremiumDue(
      policy.next_premium_due,
      policy.premium_frequency || 'annual'
    );

    await supabaseClient
      .from('insurance_policies')
      .update({ next_premium_due: nextPremiumDue })
      .eq('id', paymentData.policy_id)

    return new Response(
      JSON.stringify({
        success: true,
        payment: payment,
        next_premium_due: nextPremiumDue,
        message: 'Premium payment recorded successfully'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
