import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ProducerOrdersTable } from "@/components/producer/producer-orders-table";
import { ArrowLeft } from "lucide-react";

export default async function ProducerOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/access-request");
  if (user.role !== "producer" && user.role !== "admin") redirect("/");
  if (!user.producer_id) redirect("/producer");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 pt-top-spacing space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Orders</h1>
            <p className="text-gray-500">
              Approve reservations before they can proceed to payment.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/producer">
              <Button variant="outline" className="rounded-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        <ProducerOrdersTable showAllLink={false} />
      </div>
    </main>
  );
}

