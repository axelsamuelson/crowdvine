import { notFound } from "next/navigation";
import { isExitDiscountEnabled } from "@/lib/exit-discount/config";
import { ExitDiscountCartDesignReview } from "./client";

/**
 * Local design-review surface for the inline exit-discount cart block.
 * Public under `/dev/*`. Only mounts when the exit-discount flag is on (default OFF).
 */
export default function ExitDiscountCartDesignReviewPage() {
  if (!isExitDiscountEnabled()) {
    notFound();
  }
  return <ExitDiscountCartDesignReview />;
}
