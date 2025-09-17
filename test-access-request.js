// Test script för att verifiera access request API
// Kör detta i browser console på din site för att testa

async function testAccessRequest() {
  try {
    const response = await fetch('/api/access-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', result);
    
    if (response.ok) {
      console.log('✅ Access request API working!');
    } else {
      console.log('❌ Access request API failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error);
  }
}

// Kör testet
testAccessRequest();
