"use client";

import dynamic from "next/dynamic";

const CompleteOrderRail = dynamic(
  () =>
    import("@/components/cart/complete-order-rail").then(
      (m) => m.CompleteOrderRail,
    ),
  { ssr: false, loading: () => null },
);

export function CompleteOrderRailDynamic({
  showMobile = false,
}: {
  showMobile?: boolean;
}) {
  return <CompleteOrderRail showMobile={showMobile} />;
}
