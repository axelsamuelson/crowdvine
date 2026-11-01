import { describe, expect, it } from "vitest";
import { B2B_INQUIRY_COPY } from "@/lib/b2b/inquiry-copy";

describe("b2b inquiry guest account copy", () => {
  it("includes Axel's Swedish create-account CTA", () => {
    expect(B2B_INQUIRY_COPY.sv.createAccountCta).toBe(
      "Skapa konto för att spara förfrågan",
    );
    expect(B2B_INQUIRY_COPY.sv.createAccountSkip).toBe("Fortsätt utan konto");
  });
});
