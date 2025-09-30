"use server";

export async function testServerAction(): Promise<string> {
  console.log("🧪 testServerAction called");
  return "Server action works!";
}

export async function testServerActionWithError(): Promise<string> {
  console.log("🧪 testServerActionWithError called");
  throw new Error("Test error from server action");
}
