// test-edge-functions.js
// Test script for ILIT Edge Functions

// IMPORTANT: Replace this with your actual anon key from Supabase
const SUPABASE_URL = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w'; // Get from Supabase Settings > API

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

// Test 1: Get ILIT Details
async function testGetIlitDetails() {
    console.log(`\n${colors.blue}=== Testing get-ilit-details ===${colors.reset}`);
    
    // Test 1.1: Search by EIN
    console.log('\n📋 Test 1.1: Search by EIN (12-3456789)');
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-ilit-details`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ein: '12-3456789',
                include_beneficiaries: true
            })
        });
        
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            console.log(`${colors.green}✅ Success!${colors.reset}`);
            console.log('Found ILIT:', result.data[0]?.trustee_name);
        } else {
            console.log(`${colors.red}❌ Failed:${colors.reset}`, result.error);
        }
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
    }
    
    // Test 1.2: Search by trust name
    console.log('\n📋 Test 1.2: Search by trust name (Smith)');
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-ilit-details`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                trust_name: 'Smith'
            })
        });
        
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            console.log(`${colors.green}✅ Success!${colors.reset}`);
            console.log('Found ILITs:', result.data.length);
        } else {
            console.log(`${colors.red}❌ Failed:${colors.reset}`, result.error);
        }
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
    }
}

// Test 2: Record a New Gift
async function testRecordGift() {
    console.log(`\n${colors.blue}=== Testing record-gift ===${colors.reset}`);
    
    const newGift = {
        ilit_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        gift_date: new Date().toISOString().split('T')[0],
        gift_type: 'cash',
        amount: 36000,
        donor_name: 'Jane Doe',
        donor_email: 'jane.doe@email.com',
        description: 'Test gift via API',
        ai_confidence_score: 0.98
    };
    
    console.log('\n📝 Recording new gift of $36,000');
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/record-gift`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newGift)
        });
        
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            console.log(`${colors.green}✅ Success!${colors.reset}`);
            console.log('Gift ID:', result.data.id);
            console.log('Crummey notices should be created for beneficiaries');
            return result.data.id;
        } else {
            console.log(`${colors.red}❌ Failed:${colors.reset}`, result.error);
        }
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
    }
    return null;
}

// Test 3: Generate Crummey Notice
async function testGenerateCrummeyNotice() {
    console.log(`\n${colors.blue}=== Testing generate-crummey-notice ===${colors.reset}`);
    
    // First, we need to get a notice ID from the pending notices
    // In a real app, you'd get this from the previous function or database
    
    console.log('\n📨 Generating Crummey notice');
    console.log(`${colors.yellow}Note: You need a valid crummey_notice_id from your database${colors.reset}`);
    console.log('Check your crummey_notices table for pending notices');
    
    // Example with placeholder ID
    const exampleNoticeId = 'REPLACE_WITH_ACTUAL_NOTICE_ID';
    
    if (exampleNoticeId === 'REPLACE_WITH_ACTUAL_NOTICE_ID') {
        console.log(`${colors.yellow}⚠️  Skipping: Need real notice ID${colors.reset}`);
        return;
    }
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-crummey-notice`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                crummey_notice_id: exampleNoticeId
            })
        });
        
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            console.log(`${colors.green}✅ Success!${colors.reset}`);
            console.log('Notice status updated to:', result.data.notice_status);
        } else {
            console.log(`${colors.red}❌ Failed:${colors.reset}`, result.error);
        }
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
    }
}

// Test 4: Test Error Handling
async function testErrorHandling() {
    console.log(`\n${colors.blue}=== Testing Error Handling ===${colors.reset}`);
    
    console.log('\n🚫 Test: Missing required parameters');
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-ilit-details`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });
        
        const result = await response.json();
        if (!response.ok) {
            console.log(`${colors.green}✅ Correctly returned error:${colors.reset}`, result.error);
        } else {
            console.log(`${colors.red}❌ Should have returned an error${colors.reset}`);
        }
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
    }
}

// Main test runner
async function runAllTests() {
    console.log(`${colors.blue}${'='.repeat(50)}`);
    console.log('🧪 ILIT Edge Functions Test Suite');
    console.log(`${'='.repeat(50)}${colors.reset}`);
    
    if (SUPABASE_ANON_KEY === 'YOUR_ANON_KEY_HERE') {
        console.log(`\n${colors.red}❌ ERROR: Please update SUPABASE_ANON_KEY in this script!${colors.reset}`);
        console.log('Get your anon key from: Supabase Dashboard > Settings > API');
        return;
    }
    
    try {
        // Run all tests
        await testGetIlitDetails();
        await testRecordGift();
        await testGenerateCrummeyNotice();
        await testErrorHandling();
        
        console.log(`\n${colors.blue}${'='.repeat(50)}`);
        console.log(`✅ All tests completed!`);
        console.log(`${'='.repeat(50)}${colors.reset}\n`);
        
        console.log('Next steps:');
        console.log('1. Check your Supabase logs for any errors');
        console.log('2. Verify new records in your database');
        console.log('3. Test with your actual Crummey notice IDs');
        
    } catch (error) {
        console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
    }
}

// Run the tests
runAllTests();