import { Suspense } from "react";
import { PageLayoutServer } from "@/components/layout/page-layout-server";

// Enable ISR with 1 minute revalidation for the layout
export const revalidate = 60;

export default async function BoxesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageLayoutServer>
      <div className="flex flex-col md:grid grid-cols-12 md:gap-sides">
        <div className="col-span-12 flex flex-col h-full">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </div>
    </PageLayoutServer>
  );
}
