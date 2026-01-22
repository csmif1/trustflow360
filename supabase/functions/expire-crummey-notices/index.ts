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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date().toISOString().split('T')[0];

    // Fetch all notices with notice_status 'sent' that are past their deadline
    const { data: sentNotices, error: fetchError } = await supabase
      .from('crummey_notices')
      .select(`
        id,
        gift_id,
        beneficiary_id,
        withdrawal_deadline,
        acknowledged_at,
        notice_status
      `)
      .eq('notice_status', 'sent')

    if (fetchError) {
      console.error('Error fetching sent notices:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notices' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalChecked = 0;
    let totalExpired = 0;
    const expiredNoticeIds: string[] = [];

    // Process each notice
    for (const notice of sentNotices || []) {
      totalChecked++;

      // Skip if withdrawal was acknowledged
      if (notice.acknowledged_at) {
        continue;
      }

      // Check if deadline has passed
      if (notice.withdrawal_deadline < today) {
        // Update notice_status to expired
        const { error: updateError } = await supabase
          .from('crummey_notices')
          .update({
            notice_status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', notice.id)

        if (updateError) {
          console.error(`Error expiring notice ${notice.id}:`, updateError);
          continue;
        }

        totalExpired++;
        expiredNoticeIds.push(notice.id);

        // Log expiration event for audit trail
        await supabase
          .from('email_logs')
          .insert({
            notice_id: notice.id,
            recipient_email: 'system',
            recipient_name: 'System Event',
            subject: `Crummey Notice Expired - ID: ${notice.id}`,
            html_content: `<p>Crummey notice ${notice.id} expired on ${today}</p>`,
            sent_at: new Date().toISOString(),
            delivery_method: 'system'
          })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_checked: totalChecked,
        total_expired: totalExpired,
        expired_notice_ids: expiredNoticeIds,
        execution_timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in expire-crummey-notices:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
