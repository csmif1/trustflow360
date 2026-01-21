const SUPABASE_URL = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w'; 

async function testSpecificNotice() {
    console.log('Testing Crummey Notice Generation...\n');
    
    const noticeId = '956fada5-b236-4b59-9304-4333ce377875';
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-crummey-notice`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                crummey_notice_id: noticeId
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            console.log('✅ Success! Notice updated');
            console.log('Notice ID:', noticeId);
            console.log('New status:', result.data?.notice_status);
            console.log('Sent at:', result.data?.sent_at);
        } else {
            console.log('❌ Failed:', result.error);
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testSpecificNotice();