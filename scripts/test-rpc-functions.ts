import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function testRPCFunctions() {
  console.log("🧪 Testing RPC functions...");

  const testCode = "57280597760032980000";

  try {
    // Test validate_invitation_code
    console.log("1️⃣ Testing validate_invitation_code...");
    const { data: isValid, error: validateError } = await supabase.rpc(
      "validate_invitation_code",
      { code_input: testCode },
    );

    if (validateError) {
      console.error("❌ validate_invitation_code error:", validateError);
    } else {
      console.log("✅ validate_invitation_code result:", isValid);
    }

    // Test use_invitation_code (this will fail since we're not authenticated)
    console.log("2️⃣ Testing use_invitation_code...");
    const { data: useResult, error: useError } = await supabase.rpc(
      "use_invitation_code",
      {
        code_input: testCode,
        user_email: "test@example.com",
      },
    );

    if (useError) {
      console.error("❌ use_invitation_code error:", useError);
    } else {
      console.log("✅ use_invitation_code result:", useResult);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run if called directly
if (require.main === module) {
  testRPCFunctions();
}

export { testRPCFunctions };
