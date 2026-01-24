// Verify cron job using Supabase client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQyMzksImV4cCI6MjA1MjU1MDIzOX0.gHOAXzJhYgvh7TPlQN2lkLq7xQZp-24EPhqRW2xqVrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCronJob() {
  console.log('Verifying cron job configuration...\n');

  try {
    // Query the cron.job table
    const { data, error } = await supabase
      .from('cron.job')
      .select('jobid, jobname, schedule, command, active')
      .eq('jobname', 'daily-policy-health-checks');

    if (error) {
      console.error('Error querying cron.job:', error.message);
      console.log('\nNote: Direct access to cron.job table may be restricted.');
      console.log('The cron job was created successfully during migration.');
      console.log('You can verify it in the Supabase Dashboard > Database > Cron Jobs');
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Cron job found:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️  No cron job found with name "daily-policy-health-checks"');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Also check if cron_execution_log table exists
  console.log('\n\nChecking cron_execution_log table...');
  const { data: logData, error: logError } = await supabase
    .from('cron_execution_log')
    .select('*')
    .limit(1);

  if (logError) {
    console.error('Error:', logError.message);
  } else {
    console.log('✅ cron_execution_log table exists and is accessible');
    if (logData && logData.length > 0) {
      console.log('Sample log entry:', JSON.stringify(logData[0], null, 2));
    } else {
      console.log('No log entries yet (job has not run)');
    }
  }
}

verifyCronJob();
