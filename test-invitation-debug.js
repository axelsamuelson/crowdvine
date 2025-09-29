// Debug script for invitation page issues
console.log("🔍 Debugging invitation page issue...");

async function debugInvitationPage() {
  console.log("\n1️⃣ Testing invitation validation...");
  
  try {
    const response = await fetch('https://pactwines.com/api/invitations/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'O243JVRKVPRE' })
    });
    
    const data = await response.json();
    console.log("✅ Invitation validation response:", data);
    
    if (data.success) {
      console.log("📋 Invitation details:");
      console.log("- Code:", data.invitation.code);
      console.log("- Expires:", data.invitation.expiresAt);
      console.log("- Current uses:", data.invitation.currentUses);
      console.log("- Max uses:", data.invitation.maxUses);
      console.log("- Is active:", data.invitation.isActive);
      
      // Check if invitation is expired
      const expiresAt = new Date(data.invitation.expiresAt);
      const now = new Date();
      const isExpired = expiresAt < now;
      
      console.log("⏰ Expiry check:");
      console.log("- Expires at:", expiresAt.toISOString());
      console.log("- Current time:", now.toISOString());
      console.log("- Is expired:", isExpired);
      
      if (isExpired) {
        console.log("❌ PROBLEM: Invitation is expired!");
        return false;
      }
      
      // Check if invitation is used
      if (data.invitation.currentUses > 0) {
        console.log("❌ PROBLEM: Invitation is already used!");
        return false;
      }
      
      console.log("✅ Invitation is valid and active");
      return true;
    } else {
      console.log("❌ Invitation validation failed:", data.error);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error testing invitation validation: ${error.message}`);
    return false;
  }
}

async function debugPalletAPI() {
  console.log("\n2️⃣ Testing pallet API...");
  
  try {
    const response = await fetch('https://pactwines.com/api/admin/pallets');
    const pallets = await response.json();
    
    console.log("📋 Pallet API response:", pallets);
    
    if (Array.isArray(pallets)) {
      if (pallets.length === 0) {
        console.log("ℹ️  No pallets found - will use mock data");
        return true;
      } else {
        console.log(`✅ Found ${pallets.length} pallets`);
        return true;
      }
    } else {
      console.log("❌ Pallet API returned invalid data");
      return false;
    }
  } catch (error) {
    console.log(`❌ Error testing pallet API: ${error.message}`);
    return false;
  }
}

async function debugPageLoad() {
  console.log("\n3️⃣ Testing page load...");
  
  try {
    const response = await fetch('https://pactwines.com/i/O243JVRKVPRE');
    const html = await response.text();
    
    console.log("📋 Page load response:");
    console.log("- Status:", response.status);
    console.log("- Content-Type:", response.headers.get('content-type'));
    console.log("- HTML length:", html.length);
    
    // Check for common error indicators
    if (html.includes('Error')) {
      console.log("❌ HTML contains 'Error'");
    }
    
    if (html.includes('Loading')) {
      console.log("ℹ️  HTML contains 'Loading'");
    }
    
    if (html.includes('Congratulations')) {
      console.log("✅ HTML contains 'Congratulations'");
    }
    
    if (html.includes('Invalid')) {
      console.log("❌ HTML contains 'Invalid'");
    }
    
    // Check for JavaScript errors
    if (html.includes('script')) {
      console.log("✅ HTML contains script tags");
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error testing page load: ${error.message}`);
    return false;
  }
}

async function debugCompleteFlow() {
  console.log("🚀 Starting comprehensive invitation page debug...\n");
  
  const test1 = await debugInvitationPage();
  const test2 = await debugPalletAPI();
  const test3 = await debugPageLoad();
  
  console.log("\n📊 DEBUG RESULTS:");
  console.log(`Invitation Validation: ${test1 ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Pallet API: ${test2 ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Page Load: ${test3 ? "✅ PASSED" : "❌ FAILED"}`);
  
  const overallSuccess = test1 && test2 && test3;
  console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);
  
  if (!overallSuccess) {
    console.log("\n⚠️  ISSUES DETECTED:");
    if (!test1) console.log("- Invitation validation failed");
    if (!test2) console.log("- Pallet API failed");
    if (!test3) console.log("- Page load failed");
    
    console.log("\n🔧 POSSIBLE SOLUTIONS:");
    console.log("1. Check browser console for JavaScript errors");
    console.log("2. Verify invitation code is not expired");
    console.log("3. Check if pallet API is returning data");
    console.log("4. Verify React components are rendering correctly");
  } else {
    console.log("\n🎉 All systems working correctly!");
    console.log("If page still shows loading, check browser console for client-side errors.");
  }
  
  return overallSuccess;
}

// Run the debug
debugCompleteFlow().catch(console.error);
