import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduledCheckResult {
  success: boolean;
  total_policies: number;
  policies_eligible: number;
  checks_run: number;
  checks_successful: number;
  checks_failed: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  remediations_created: number;
  execution_time_ms: number;
  timestamp: string;
  errors: string[];
}

interface PolicyPriority {
  policy_id: string;
  policy_number: string;
  trust_name: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  reason: string;
  premium_due_date?: string;
  last_check_date?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log('='.repeat(80));
  console.log('SCHEDULED HEALTH CHECKS - BATCH RUN');
  console.log(`Started at: ${timestamp}`);
  console.log('='.repeat(80));

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const result: ScheduledCheckResult = {
      success: true,
      total_policies: 0,
      policies_eligible: 0,
      checks_run: 0,
      checks_successful: 0,
      checks_failed: 0,
      healthy_count: 0,
      warning_count: 0,
      critical_count: 0,
      remediations_created: 0,
      execution_time_ms: 0,
      timestamp,
      errors: []
    };

    // STEP 1: Fetch all active policies
    console.log('\n[STEP 1] Fetching active policies...');
    const { data: allPolicies, error: policiesError } = await supabase
      .from('insurance_policies')
      .select(`
        id,
        policy_number,
        policy_status,
        next_premium_due,
        trusts!inner(
          id,
          trust_name,
          status
        )
      `)
      .eq('policy_status', 'active')
      .eq('trusts.status', 'active');

    if (policiesError) {
      throw new Error(`Failed to fetch policies: ${policiesError.message}`);
    }

    result.total_policies = allPolicies?.length || 0;
    console.log(`Found ${result.total_policies} active policies`);

    if (result.total_policies === 0) {
      console.log('No active policies to check. Exiting.');
      result.execution_time_ms = Date.now() - startTime;
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 2: Fetch recent health checks to avoid duplicates
    console.log('\n[STEP 2] Checking for recent health checks (last 24 hours)...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentChecks, error: checksError } = await supabase
      .from('policy_health_checks')
      .select('policy_id, check_date')
      .gte('check_date', twentyFourHoursAgo.split('T')[0]);

    if (checksError) {
      console.error('Error fetching recent checks:', checksError);
    }

    const recentlyCheckedPolicyIds = new Set(recentChecks?.map(c => c.policy_id) || []);
    console.log(`${recentlyCheckedPolicyIds.size} policies checked in last 24 hours (will skip)`);

    // STEP 3: Prioritize policies
    console.log('\n[STEP 3] Prioritizing policies...');
    const prioritizedPolicies: PolicyPriority[] = [];
    const now = Date.now();

    for (const policy of allPolicies || []) {
      // Skip recently checked policies
      if (recentlyCheckedPolicyIds.has(policy.id)) {
        continue;
      }

      let priority: 'urgent' | 'high' | 'medium' | 'low' = 'low';
      let reason = 'Regular scheduled check';

      // Check for upcoming premiums
      if (policy.next_premium_due) {
        const premiumDueDate = new Date(policy.next_premium_due).getTime();
        const daysUntilDue = Math.ceil((premiumDueDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntilDue <= 7 && daysUntilDue >= 0) {
          priority = 'urgent';
          reason = `Premium due in ${daysUntilDue} days`;
        } else if (daysUntilDue <= 30 && daysUntilDue > 7) {
          priority = 'high';
          reason = `Premium due in ${daysUntilDue} days`;
        }
      }

      // Check for policies never checked or not checked in > 90 days
      const lastCheckData = await supabase
        .from('policy_health_checks')
        .select('check_date')
        .eq('policy_id', policy.id)
        .order('check_date', { ascending: false })
        .limit(1)
        .single();

      if (!lastCheckData.data) {
        priority = 'high';
        reason = 'Never been checked';
      } else {
        const lastCheckDate = new Date(lastCheckData.data.check_date).getTime();
        const daysSinceCheck = Math.ceil((now - lastCheckDate) / (1000 * 60 * 60 * 24));

        if (daysSinceCheck > 90 && priority === 'low') {
          priority = 'medium';
          reason = `Not checked in ${daysSinceCheck} days`;
        }
      }

      prioritizedPolicies.push({
        policy_id: policy.id,
        policy_number: policy.policy_number,
        trust_name: policy.trusts.trust_name,
        priority,
        reason,
        premium_due_date: policy.next_premium_due,
        last_check_date: lastCheckData.data?.check_date
      });
    }

    // Sort by priority: urgent > high > medium > low
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    prioritizedPolicies.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    result.policies_eligible = prioritizedPolicies.length;
    console.log(`${result.policies_eligible} policies eligible for health checks`);
    console.log(`Priority breakdown:`);
    console.log(`  - Urgent: ${prioritizedPolicies.filter(p => p.priority === 'urgent').length}`);
    console.log(`  - High: ${prioritizedPolicies.filter(p => p.priority === 'high').length}`);
    console.log(`  - Medium: ${prioritizedPolicies.filter(p => p.priority === 'medium').length}`);
    console.log(`  - Low: ${prioritizedPolicies.filter(p => p.priority === 'low').length}`);

    // STEP 4: Batch process health checks
    console.log('\n[STEP 4] Running health checks in batches...');
    const BATCH_SIZE = 50; // Process 50 policies per batch
    const BATCH_DELAY_MS = 2000; // 2 second delay between batches
    const INTRA_BATCH_DELAY_MS = 500; // 0.5 second delay between checks within batch

    const batches = [];
    for (let i = 0; i < prioritizedPolicies.length; i += BATCH_SIZE) {
      batches.push(prioritizedPolicies.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${batches.length} batches of up to ${BATCH_SIZE} policies each`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n--- Batch ${batchIndex + 1}/${batches.length} (${batch.length} policies) ---`);

      for (const policy of batch) {
        result.checks_run++;

        try {
          console.log(`[${result.checks_run}/${result.policies_eligible}] Checking ${policy.policy_number} (${policy.priority}: ${policy.reason})`);

          // Call analyze-policy-health function
          const healthCheckResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-policy-health`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                policy_id: policy.policy_id,
                check_trigger: 'scheduled'
              })
            }
          );

          if (!healthCheckResponse.ok) {
            throw new Error(`Health check failed: ${healthCheckResponse.statusText}`);
          }

          const healthCheckResult = await healthCheckResponse.json();

          result.checks_successful++;

          // Count by status
          if (healthCheckResult.overall_status === 'healthy') {
            result.healthy_count++;
          } else if (healthCheckResult.overall_status === 'warning') {
            result.warning_count++;
          } else if (healthCheckResult.overall_status === 'critical') {
            result.critical_count++;
          }

          // Count remediation actions
          result.remediations_created += healthCheckResult.remediation_actions_created || 0;

          console.log(`  ✓ Status: ${healthCheckResult.overall_status}, Score: ${healthCheckResult.health_score}, Actions: ${healthCheckResult.remediation_actions_created || 0}`);

          // Log to ai_processing_log
          await supabase
            .from('ai_processing_log')
            .insert({
              entity_type: 'policy_health',
              entity_id: policy.policy_id,
              model_name: 'gemini-2.5-flash',
              ai_response: healthCheckResult,
              confidence_score: healthCheckResult.ai_confidence,
              processing_time_ms: null,
              success: true,
              error_message: null
            });

          // Delay between checks within batch
          if (batch.indexOf(policy) < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, INTRA_BATCH_DELAY_MS));
          }

        } catch (error) {
          result.checks_failed++;
          const errorMsg = `Failed to check ${policy.policy_number}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`  ✗ ${errorMsg}`);

          // Log failure to ai_processing_log
          await supabase
            .from('ai_processing_log')
            .insert({
              entity_type: 'policy_health',
              entity_id: policy.policy_id,
              model_name: 'gemini-2.5-flash',
              ai_response: { error: error.message },
              confidence_score: null,
              processing_time_ms: null,
              success: false,
              error_message: error.message
            });
        }
      }

      // Delay between batches
      if (batchIndex < batches.length - 1) {
        console.log(`Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    result.execution_time_ms = Date.now() - startTime;

    // STEP 5: Generate summary
    console.log('\n' + '='.repeat(80));
    console.log('BATCH RUN COMPLETED');
    console.log('='.repeat(80));
    console.log(`Total Execution Time: ${(result.execution_time_ms / 1000).toFixed(2)}s`);
    console.log(`Total Policies: ${result.total_policies}`);
    console.log(`Eligible for Check: ${result.policies_eligible}`);
    console.log(`Checks Run: ${result.checks_run}`);
    console.log(`Successful: ${result.checks_successful}`);
    console.log(`Failed: ${result.checks_failed}`);
    console.log(`\nResults:`);
    console.log(`  - Healthy: ${result.healthy_count}`);
    console.log(`  - Warning: ${result.warning_count}`);
    console.log(`  - Critical: ${result.critical_count}`);
    console.log(`  - Remediation Actions Created: ${result.remediations_created}`);

    if (result.errors.length > 0) {
      console.log(`\nErrors (${result.errors.length}):`);
      result.errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    console.log('='.repeat(80));

    // TODO: STEP 6: Send summary email to admin (future enhancement)

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error in scheduled health checks:', error);

    const errorResult: ScheduledCheckResult = {
      success: false,
      total_policies: 0,
      policies_eligible: 0,
      checks_run: 0,
      checks_successful: 0,
      checks_failed: 0,
      healthy_count: 0,
      warning_count: 0,
      critical_count: 0,
      remediations_created: 0,
      execution_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      errors: [error.message]
    };

    return new Response(
      JSON.stringify(errorResult),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
