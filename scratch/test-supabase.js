const supabaseUrl = 'https://yvxdkbkcqushtaeadqps.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2eGRrYmtjcXVzaHRhZWFkcXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzQ1ODcsImV4cCI6MjA5NjE1MDU4N30.fDVxwvfLfWyB5VEjkq5yAKYCYvp0_ZZeoF0xw81aG0E';

async function test() {
  console.log('Testing connection to offers table...');
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/offers?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    console.log('HTTP Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

test();
