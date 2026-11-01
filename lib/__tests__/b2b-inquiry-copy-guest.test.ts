import { describe, expect, it } from "vitest";
import { B2B_INQUIRY_COPY } from "@/lib/b2b/inquiry-copy";

describe("b2b inquiry guest account copy", () => {
  it("includes Inès account-offer copy", () => {
    expect(B2B_INQUIRY_COPY.sv.createAccountCta).toBe("Skapa konto");
    expect(B2B_INQUIRY_COPY.sv.createAccountSkip).toBe("Inte nu");
    expect(B2B_INQUIRY_COPY.sv.createAccountHint).toBe(
      "Med ett konto ser du dina förfrågningar och fakturor på ett ställe.",
    );
    expect(B2B_INQUIRY_COPY.sv.pageIntro).toBe(
      "Vi återkommer med bekräftelse och faktura. Ingen betalning sker här.",
    );
    expect(B2B_INQUIRY_COPY.sv.successBody).toContain("inom en arbetsdag");
    expect(B2B_INQUIRY_COPY.sv.successBody).not.toContain("inom 1 arbetsdag");
  });
});
