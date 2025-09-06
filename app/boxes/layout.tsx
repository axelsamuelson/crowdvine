import { Suspense } from "react";
import { PageLayout } from "@/components/layout/page-layout";

// Enable ISR with 1 minute revalidation for the layout
export const revalidate = 60;

export default async function BoxesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageLayout>
      <div className="flex flex-col md:grid grid-cols-12 md:gap-sides">
        <div className="col-span-12 flex flex-col h-full md:pt-top-spacing">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </div>
    </PageLayout>
  );
}
