"use server";

export async function simpleAddItem(variantId: string): Promise<string> {
  console.log("🔧 simpleAddItem called with variantId:", variantId);

  try {
    // Extract base ID from variant ID (remove -default suffix)
    const baseId = variantId.replace("-default", "");
    console.log("🔧 Extracted baseId:", baseId);

    // Just return success for now
    console.log("🔧 simpleAddItem returning success");
    return "success";
  } catch (error) {
    console.error("🔧 simpleAddItem error:", error);
    return "error";
  }
}
