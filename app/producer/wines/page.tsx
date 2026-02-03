import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function ProducerWinesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/access-request");
  if (user.role !== "producer" && user.role !== "admin") redirect("/");
  if (!user.producer_id) redirect("/producer");

  const sb = await supabaseServer();
  const { data: wines } = await sb
    .from("wines")
    .select("id, wine_name, vintage, handle, producer_id, created_at")
    .eq("producer_id", user.producer_id)
    .order("wine_name");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              Your Wines
            </h1>
            <p className="text-gray-500">
              Manage wines connected to your producer account.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/producer">
              <Button variant="outline" className="rounded-full">
                Back
              </Button>
            </Link>
            <Link href="/producer/wines/new">
              <Button className="bg-black hover:bg-black/90 text-white rounded-full">
                Add wine
              </Button>
            </Link>
          </div>
        </div>

        <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-medium text-gray-900">
              Wines ({wines?.length || 0})
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {(wines || []).map((w, idx) => (
              <div
                key={w.id}
                className={[
                  "flex items-center justify-between gap-4 px-4 py-3",
                  idx !== 0 ? "border-t border-gray-200" : "",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {w.wine_name}{" "}
                    <span className="text-gray-500 font-normal">
                      {w.vintage ? `(${w.vintage})` : ""}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{w.handle}</div>
                </div>
                <Link href={`/producer/wines/${w.id}`}>
                  <Button variant="outline" size="sm" className="rounded-full">
                    Edit
                  </Button>
                </Link>
              </div>
            ))}
            {(wines || []).length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500">
                No wines yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}


