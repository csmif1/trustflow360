import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface ReminderInput {
  window_days?: number;
}

function validateReminderInput(body: any): { valid: boolean; error?: string; data?: ReminderInput } {
  if (body.window_days !== undefined && body.window_days !== null) {
    if (typeof body.window_days !== 'number' || body.window_days < 1) {
      return { valid: false, error: 'window_days must be a positive number' };
    }
  }

  return { valid: true, data: body as ReminderInput };
}

function calculateDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
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

    const body = await req.json().catch(() => ({}));

    const validation = validateReminderInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { window_days = 90 } = validation.data!;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + window_days);

    const { data: policies, error: policiesError } = await supabaseClient
      .from('insurance_policies')
      .select('id, trust_id, annual_premium, next_premium_due, policy_status')
      .eq('policy_status', 'active')
      .gte('next_premium_due', today.toISOString().split('T')[0])
      .lte('next_premium_due', futureDate.toISOString().split('T')[0])

    if (policiesError) {
      console.error('Error fetching policies:', policiesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch policies' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const totalChecked = policies?.length || 0;
    let remindersCreated = 0;
    let remindersUpdated = 0;

    for (const policy of policies || []) {
      if (!policy.next_premium_due) continue;

      const daysUntil = calculateDaysUntil(policy.next_premium_due);

      const { data: existingReminder } = await supabaseClient
        .from('upcoming_premiums')
        .select('id')
        .eq('policy_id', policy.id)
        .eq('next_due_date', policy.next_premium_due)
        .maybeSingle()

      if (existingReminder) {
        const { error: updateError } = await supabaseClient
          .from('upcoming_premiums')
          .update({
            days_until_due: daysUntil,
            amount_due: policy.annual_premium || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReminder.id)

        if (!updateError) {
          remindersUpdated++;
        }
      } else {
        const { error: insertError } = await supabaseClient
          .from('upcoming_premiums')
          .insert({
            policy_id: policy.id,
            trust_id: policy.trust_id,
            next_due_date: policy.next_premium_due,
            amount_due: policy.annual_premium || 0,
            days_until_due: daysUntil,
            reminder_sent: false,
            status: 'pending'
          })

        if (!insertError) {
          remindersCreated++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_checked: totalChecked,
        reminders_created: remindersCreated,
        reminders_updated: remindersUpdated,
        window_days: window_days,
        message: 'Premium reminders check completed successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-premium-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
