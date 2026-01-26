import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface PolicyInput {
  trust_id: string;
  carrier: string;
  policy_number: string;
  insured_name: string;
  policy_type?: string;
  insured_dob?: string;
  death_benefit?: number;
  cash_value?: number;
  policy_owner?: string;
  annual_premium?: number;
  premium_frequency?: 'annual' | 'semi-annual' | 'quarterly' | 'monthly';
  premium_due_date?: string;
  next_premium_due?: string;
  policy_status?: string;
  issue_date?: string;
  notes?: string;
}

function validatePolicyInput(body: any): { valid: boolean; error?: string; data?: PolicyInput } {
  // Check required fields
  if (!body.trust_id) {
    return { valid: false, error: 'Missing required field: trust_id' };
  }
  if (!body.carrier) {
    return { valid: false, error: 'Missing required field: carrier' };
  }
  if (!body.policy_number) {
    return { valid: false, error: 'Missing required field: policy_number' };
  }
  if (!body.insured_name) {
    return { valid: false, error: 'Missing required field: insured_name' };
  }

  // Validate premium amount if provided
  if (body.annual_premium !== undefined && body.annual_premium !== null) {
    if (typeof body.annual_premium !== 'number' || body.annual_premium <= 0) {
      return { valid: false, error: 'annual_premium must be a positive number' };
    }
  }

  // Validate date formats if provided
  if (body.next_premium_due) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.next_premium_due)) {
      return { valid: false, error: 'next_premium_due must be in YYYY-MM-DD format' };
    }
  }

  if (body.premium_due_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.premium_due_date)) {
      return { valid: false, error: 'premium_due_date must be in YYYY-MM-DD format' };
    }
  }

  if (body.issue_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.issue_date)) {
      return { valid: false, error: 'issue_date must be in YYYY-MM-DD format' };
    }
  }

  if (body.insured_dob) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.insured_dob)) {
      return { valid: false, error: 'insured_dob must be in YYYY-MM-DD format' };
    }
  }

  // Validate premium frequency if provided
  if (body.premium_frequency) {
    const validFrequencies = ['annual', 'semi-annual', 'quarterly', 'monthly'];
    if (!validFrequencies.includes(body.premium_frequency)) {
      return { valid: false, error: 'premium_frequency must be one of: annual, semi-annual, quarterly, monthly' };
    }
  }

  return { valid: true, data: body as PolicyInput };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()

    // Validate input
    const validation = validatePolicyInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const policyData = validation.data!;

    // Check if trust exists
    const { data: trustExists, error: trustError } = await supabaseClient
      .from('trusts')
      .select('id')
      .eq('id', policyData.trust_id)
      .single()

    if (trustError || !trustExists) {
      return new Response(
        JSON.stringify({ error: 'Trust not found', details: 'The specified trust_id does not exist' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate policy number
    const { data: existingPolicy } = await supabaseClient
      .from('insurance_policies')
      .select('id')
      .eq('policy_number', policyData.policy_number)
      .maybeSingle()

    if (existingPolicy) {
      return new Response(
        JSON.stringify({
          error: 'Duplicate policy number',
          details: 'A policy with this policy_number already exists'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the insurance policy
    const { data: policy, error: policyError } = await supabaseClient
      .from('insurance_policies')
      .insert({
        trust_id: policyData.trust_id,
        carrier: policyData.carrier,
        policy_number: policyData.policy_number,
        insured_name: policyData.insured_name,
        policy_type: policyData.policy_type,
        insured_dob: policyData.insured_dob,
        death_benefit: policyData.death_benefit,
        cash_value: policyData.cash_value,
        policy_owner: policyData.policy_owner,
        annual_premium: policyData.annual_premium,
        premium_frequency: policyData.premium_frequency || 'annual',
        premium_due_date: policyData.premium_due_date,
        next_premium_due: policyData.next_premium_due,
        policy_status: policyData.policy_status || 'active',
        issue_date: policyData.issue_date,
        notes: policyData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (policyError) {
      console.error('Error creating policy:', policyError);
      return new Response(
        JSON.stringify({ error: 'Failed to create policy', details: policyError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return success response with created policy
    return new Response(
      JSON.stringify({
        success: true,
        policy: policy,
        message: 'Insurance policy added successfully'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in add-insurance-policy:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
