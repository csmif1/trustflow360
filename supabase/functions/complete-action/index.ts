import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteActionRequest {
  action_id?: string;
  action_ids?: string[];
  notes: string;
  completed_by_id?: string;
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
    const body: CompleteActionRequest = await req.json();

    // Validate request
    if (!body.notes || body.notes.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Completion notes are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.notes.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Notes must be 500 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if single or bulk completion
    const isBulk = !!body.action_ids && body.action_ids.length > 0;
    const actionIds = isBulk ? body.action_ids : (body.action_id ? [body.action_id] : []);

    if (actionIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Either action_id or action_ids must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify actions exist and get their current status
    const { data: existingActions, error: fetchError } = await supabase
      .from('remediation_actions')
      .select('id, status, title')
      .in('id', actionIds);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch actions', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingActions || existingActions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No actions found with provided IDs' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if any actions are already completed
    const alreadyCompleted = existingActions.filter(a => a.status === 'completed');
    if (alreadyCompleted.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Some actions are already completed',
          already_completed: alreadyCompleted.map(a => ({ id: a.id, title: a.title }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update actions to completed status
    const { data: completedActions, error: updateError } = await supabase
      .from('remediation_actions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: body.completed_by_id || null,
        completion_notes: body.notes.trim()
      })
      .in('id', actionIds)
      .select();

    if (updateError) {
      console.error('Error updating remediation actions:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to complete actions', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return appropriate response based on single vs bulk
    if (isBulk) {
      return new Response(
        JSON.stringify({
          success: true,
          completed_count: completedActions?.length || 0,
          actions: completedActions,
          message: `Successfully completed ${completedActions?.length || 0} action(s)`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          action: completedActions?.[0] || null,
          message: 'Action completed successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
