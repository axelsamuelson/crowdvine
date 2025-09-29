// Test invitation redeem API fix
console.log("🔍 Testing invitation redeem API fix...\n");

async function testInvitationRedeem() {
  const code = 'ZLR6U13VA86Z';
  
  console.log("1️⃣ Testing invitation redeem API...");
  try {
    const response = await fetch('https://pactwines.com/api/invitations/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitation_code: code,
        email: 'test@example.com',
        password: 'testpassword123',
        full_name: 'Test User'
      })
    });
    
    const data = await response.json();
    
    console.log("✅ Invitation redeem API:", response.ok ? "PASSED" : "FAILED");
    console.log("   - Status:", response.status);
    console.log("   - Success:", data.success);
    
    if (data.success) {
      console.log("   - Auto signed in:", data.autoSignedIn);
      console.log("   - Has session:", !!data.session);
      console.log("   - User ID:", data.user?.id);
    } else {
      console.log("   - Error:", data.error);
      console.log("   - Details:", data.details);
    }
  } catch (error) {
    console.log("❌ Invitation redeem API failed:", error.message);
  }

  console.log("\n2️⃣ Testing with valid invitation code...");
  try {
    const response = await fetch('https://pactwines.com/api/invitations/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    
    console.log("✅ Invitation validation:", data.success ? "PASSED" : "FAILED");
    console.log("   - Code:", data.invitation?.code);
    console.log("   - Active:", data.invitation?.isActive);
    console.log("   - Current uses:", data.invitation?.currentUses);
    console.log("   - Max uses:", data.invitation?.maxUses);
  } catch (error) {
    console.log("❌ Invitation validation failed:", error.message);
  }

  console.log("\n🎯 EXPECTED RESULT:");
  console.log("✅ API should accept invitation_code parameter");
  console.log("✅ API should handle full_name parameter");
  console.log("✅ API should create user and profile successfully");
  console.log("✅ API should return session tokens for auto-login");
}

testInvitationRedeem().catch(console.error);
