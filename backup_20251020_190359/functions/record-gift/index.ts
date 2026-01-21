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

    const { 
      ilit_id,
      gift_date,
      gift_type,
      amount,
      donor_name,
      description,
      ai_confidence_score,
      supporting_doc_url
    } = await req.json()

    const { data: gift, error: giftError } = await supabaseClient
      .from('gifts')
      .insert({
        ilit_id,
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
        message: 'Gift recorded successfully'
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
