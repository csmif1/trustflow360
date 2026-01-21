import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { 
      ilit_id,
      gift_date,
      gift_type,
      amount,
      donor_name,
      description,
      ai_confidence_score,
      supporting_doc_url,
      ein,
      trust_name,
      trustee_name,
      beneficiaries
    } = body

    let finalIlitId = ilit_id;

    // If no ilit_id, try to find or create the trust
    if (!finalIlitId && ein) {
      const { data: existingIlit } = await supabaseClient
        .from('ilits')
        .select('id')
        .eq('ein', ein)
        .single()

      if (existingIlit) {
        finalIlitId = existingIlit.id
      } else if (trust_name && trustee_name) {
        // Create new trust and ILIT
        const { data: newTrust } = await supabaseClient
          .from('trusts')
          .insert({
            trust_name: trust_name,
            ein: ein,
            grantor_name: donor_name,
            trust_date: gift_date || new Date().toISOString().split('T')[0],
            trust_type: 'ILIT',
            status: 'active',
            trustee_name: trustee_name
          })
          .select()
          .single()

        if (newTrust) {
          const { data: newIlit } = await supabaseClient
            .from('ilits')
            .insert({
              trust_id: newTrust.id,
              ein: ein,
              trustee_name: trustee_name,
              trustee_email: `${trustee_name.toLowerCase().replace(' ', '.')}@email.com`,
              grantor_name: donor_name,
              annual_exclusion_amount: amount,
              crummey_notice_days: 30
            })
            .select()
            .single()

          if (newIlit) {
            finalIlitId = newIlit.id

            // Create beneficiaries
            if (beneficiaries && beneficiaries.length > 0) {
              const withdrawalPercentage = (100 / beneficiaries.length).toFixed(2)
              
              for (const beneficiary of beneficiaries) {
                await supabaseClient
                  .from('beneficiaries')
                  .insert({
                    trust_id: newTrust.id,
                    name: beneficiary,
                    withdrawal_percentage: parseFloat(withdrawalPercentage),
                    is_primary: true,
                    notification_preferences: { email: true, mail: false },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
              }
            }
          }
        }
      }
    }

    if (!finalIlitId) {
      throw new Error('Unable to find or create ILIT')
    }

    // Record the gift
    const { data: gift, error: giftError } = await supabaseClient
      .from('gifts')
      .insert({
        ilit_id: finalIlitId,
        gift_date,
        gift_type: gift_type || 'cash',
        amount,
        donor_name,
        description,
        ai_confidence_score,
        supporting_doc_url,
        metadata: {},
        ai_extracted_data: {},
        dlp_findings: {},
        requires_manual_review: false
      })
      .select()
      .single()

    if (giftError) throw giftError

    return new Response(
      JSON.stringify({ 
        success: true, 
        gift,
        message: 'Gift recorded and trust created if needed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
