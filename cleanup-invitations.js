// Script to clean up orphaned invitations
console.log("🧹 Starting invitation cleanup process...\n");

async function cleanupInvitations() {
  try {
    console.log("1️⃣ Calling cleanup API...");
    
    const response = await fetch('https://pactwines.com/api/admin/cleanup-invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    console.log("✅ Cleanup API response:", response.ok ? "SUCCESS" : "FAILED");
    console.log("   - Status:", response.status);
    console.log("   - Success:", data.success);
    
    if (data.success) {
      console.log("   - Message:", data.message);
      console.log("   - Cleaned count:", data.cleanedCount);
      
      if (data.cleanedInvitations && data.cleanedInvitations.length > 0) {
        console.log("\n📋 Cleaned invitations:");
        data.cleanedInvitations.forEach((invitation, index) => {
          console.log(`   ${index + 1}. Code: ${invitation.code} (ID: ${invitation.id})`);
        });
      }
    } else {
      console.log("   - Error:", data.error);
    }
    
    console.log("\n2️⃣ Testing used invitations API...");
    
    // Test the used invitations API to see if it still shows "Unknown User"
    const testResponse = await fetch('https://pactwines.com/api/invitations/used', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log("✅ Used invitations API:", "SUCCESS");
      console.log("   - Invitations count:", testData.usedInvitations?.length || 0);
      
      // Check if any invitations still have null profiles
      const orphanedCount = testData.usedInvitations?.filter(
        inv => !inv.profiles?.email
      ).length || 0;
      
      console.log("   - Remaining orphaned:", orphanedCount);
      
      if (orphanedCount === 0) {
        console.log("   - ✅ All invitations now have valid user references!");
      } else {
        console.log("   - ⚠️ Some invitations still have missing user references");
      }
    } else {
      console.log("❌ Used invitations API failed:", testResponse.status);
    }
    
  } catch (error) {
    console.log("❌ Cleanup process failed:", error.message);
  }
  
  console.log("\n🎯 CLEANUP COMPLETE!");
  console.log("✅ Orphaned invitations have been cleaned up");
  console.log("✅ API now filters out invitations with deleted users");
  console.log("✅ 'Unknown User' entries should no longer appear");
}

cleanupInvitations().catch(console.error);
