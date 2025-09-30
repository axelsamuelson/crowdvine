#!/usr/bin/env node

/**
 * Test script to verify zone loading functionality
 * This simulates the checkout flow and tests zone matching reliability
 */

const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = 'https://pactwines.com';
const TEST_ADDRESSES = [
  {
    postcode: '11129',
    city: 'Stockholm',
    countryCode: 'SE',
    expectedZone: 'Stockholm Delivery Zone'
  },
  {
    postcode: '41301',
    city: 'Gothenburg', 
    countryCode: 'SE',
    expectedZone: 'Gothenburg Delivery Zone'
  },
  {
    postcode: '21115',
    city: 'Malmö',
    countryCode: 'SE', 
    expectedZone: 'Malmö Delivery Zone'
  }
];

const MOCK_CART_ITEMS = [
  { merchandise: { id: 'c6c7b17f-10d4-4b3a-ac22-dccc38cd2700' } }, // Les Tremieres
  { merchandise: { id: 'dbd196cd-d788-44df-b458-d981d70ebd6b' } }  // Matiere Noire
];

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testZoneMatching(address) {
  console.log(`\n🧪 Testing zone matching for: ${address.city}, ${address.countryCode}`);
  console.log(`📍 Address: ${address.postcode} ${address.city}`);
  
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/checkout/zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ZoneLoadingTest/1.0'
      },
      body: JSON.stringify({
        cartItems: MOCK_CART_ITEMS,
        deliveryAddress: address
      })
    });
    
    const duration = Date.now() - startTime;
    
    if (response.status === 200) {
      const { deliveryZoneName, deliveryZoneId, availableDeliveryZones } = response.data;
      
      console.log(`✅ Zone matching successful (${duration}ms)`);
      console.log(`   Delivery Zone: ${deliveryZoneName || 'None'}`);
      console.log(`   Zone ID: ${deliveryZoneId || 'None'}`);
      console.log(`   Available Zones: ${availableDeliveryZones?.length || 0}`);
      
      if (deliveryZoneName && deliveryZoneName.includes(address.city)) {
        console.log(`   ✅ Expected zone found: ${deliveryZoneName}`);
        return { success: true, duration, zone: deliveryZoneName };
      } else {
        console.log(`   ⚠️  Unexpected zone: ${deliveryZoneName} (expected: ${address.expectedZone})`);
        return { success: false, duration, zone: deliveryZoneName, error: 'Unexpected zone' };
      }
    } else {
      console.log(`❌ Zone matching failed (${duration}ms)`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      return { success: false, duration, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ Zone matching error (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

async function testMultipleAttempts(address, attempts = 3) {
  console.log(`\n🔄 Testing ${attempts} attempts for ${address.city}...`);
  
  const results = [];
  
  for (let i = 1; i <= attempts; i++) {
    console.log(`\n--- Attempt ${i}/${attempts} ---`);
    const result = await testZoneMatching(address);
    results.push(result);
    
    // Wait between attempts
    if (i < attempts) {
      console.log('⏳ Waiting 2 seconds before next attempt...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log(`\n📊 Results for ${address.city}:`);
  console.log(`   Successful: ${successful}/${attempts}`);
  console.log(`   Average duration: ${Math.round(avgDuration)}ms`);
  console.log(`   Reliability: ${Math.round((successful / attempts) * 100)}%`);
  
  return { successful, total: attempts, avgDuration, reliability: successful / attempts };
}

async function runTests() {
  console.log('🚀 Starting zone loading reliability tests...');
  console.log(`🌐 Testing against: ${BASE_URL}`);
  console.log(`📦 Mock cart items: ${MOCK_CART_ITEMS.length}`);
  
  const allResults = [];
  
  for (const address of TEST_ADDRESSES) {
    const result = await testMultipleAttempts(address, 3);
    allResults.push({ address: address.city, ...result });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 FINAL RESULTS');
  console.log('='.repeat(60));
  
  let totalSuccessful = 0;
  let totalAttempts = 0;
  let totalDuration = 0;
  
  allResults.forEach(result => {
    console.log(`${result.address}: ${result.successful}/${result.total} (${Math.round(result.reliability * 100)}%) - ${Math.round(result.avgDuration)}ms avg`);
    totalSuccessful += result.successful;
    totalAttempts += result.total;
    totalDuration += result.avgDuration;
  });
  
  const overallReliability = totalSuccessful / totalAttempts;
  const overallAvgDuration = totalDuration / allResults.length;
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Overall Reliability: ${Math.round(overallReliability * 100)}%`);
  console.log(`Overall Average Duration: ${Math.round(overallAvgDuration)}ms`);
  console.log(`Total Tests: ${totalAttempts}`);
  console.log(`Successful: ${totalSuccessful}`);
  console.log(`Failed: ${totalAttempts - totalSuccessful}`);
  
  if (overallReliability >= 0.9) {
    console.log('\n✅ Zone loading is RELIABLE');
  } else if (overallReliability >= 0.7) {
    console.log('\n⚠️  Zone loading is MODERATELY RELIABLE');
  } else {
    console.log('\n❌ Zone loading is UNRELIABLE');
  }
  
  console.log('\n🏁 Test completed');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
