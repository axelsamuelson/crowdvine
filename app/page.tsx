import { PageLayout } from "@/components/layout/page-layout";

export default function Home() {
  return (
    <PageLayout>
      <div className="contents md:grid md:grid-cols-12 md:gap-sides">
        <div className="flex relative flex-col grid-cols-2 col-span-8 w-full md:grid">
          <div className="fixed top-0 left-0 z-10 w-full pointer-events-none base-grid py-sides">
            <div className="col-span-8 col-start-5">
              <div className="hidden px-6 lg:block">
                <h1 className="text-2xl font-bold">Welcome to CrowdVine</h1>
              </div>
            </div>
          </div>
          <div className="col-span-8">
            <p className="text-lg">Your wine community platform is ready!</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
