// Test script för admin access requests API
// Kör detta i browser console eller som fetch request

async function testAdminAPI() {
  try {
    console.log('Testing admin access requests API...');
    
    // Test 1: Kontrollera om admin cookies finns
    const cookies = document.cookie;
    console.log('Current cookies:', cookies);
    
    // Test 2: Anropa admin API
    const response = await fetch('/api/admin/access-requests', {
      method: 'GET',
      credentials: 'include', // Inkludera cookies
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    
    // Test 3: Kontrollera om det finns requests
    if (Array.isArray(data)) {
      console.log(`Found ${data.length} access requests`);
      if (data.length > 0) {
        console.log('First request:', data[0]);
      }
    } else {
      console.log('Unexpected response format:', data);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Kör testet
testAdminAPI();
