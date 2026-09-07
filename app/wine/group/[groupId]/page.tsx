import type { Metadata } from "next";

export { default } from "@/app/vin/group/[groupId]/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};
