import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function ProducerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/access-request");
  }

  if (user.role !== "producer" && user.role !== "admin") {
    redirect("/");
  }

  if (!user.producer_id) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-8">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              Producer Dashboard
            </h1>
            <p className="text-gray-500">
              Your account is marked as a producer, but it is not linked to any
              producer record yet. Ask an admin to link your account to a
              producer.
            </p>
          </div>

          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <div className="text-sm text-gray-600">
              Once linked, you’ll be able to update producer information and
              manage wines connected to your producer.
            </div>
          </Card>
        </div>
      </main>
    );
  }

  const sb = await supabaseServer();

  const [{ data: producer }, { data: wines }] = await Promise.all([
    sb.from("producers").select("*").eq("id", user.producer_id).maybeSingle(),
    sb
      .from("wines")
      .select("id, wine_name, vintage, handle, producer_id, created_at")
      .eq("producer_id", user.producer_id)
      .order("wine_name"),
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              Producer Dashboard
            </h1>
            <p className="text-gray-500">
              Manage your producer profile and wines.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/producer/profile">
              <Button variant="outline" className="rounded-full">
                Edit profile
              </Button>
            </Link>
            <Link href="/producer/wines/new">
              <Button className="bg-black hover:bg-black/90 text-white rounded-full">
                Add wine
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl lg:col-span-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-gray-900">Producer</div>
                <div className="mt-2 text-lg font-medium text-gray-900">
                  {producer?.name || "—"}
                </div>
                <div className="text-sm text-gray-500">
                  {producer?.region || ""}
                  {producer?.country_code ? ` • ${producer.country_code}` : ""}
                </div>
              </div>
            </div>
            {producer?.short_description && (
              <p className="text-sm text-gray-500 mt-4 leading-relaxed">
                {producer.short_description}
              </p>
            )}
          </Card>

          <Card className="p-6 bg-white border border-gray-200 rounded-2xl lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-gray-900">Wines</div>
                <div className="text-sm text-gray-500 mt-1">
                  {wines?.length || 0} wines
                </div>
              </div>
              <Link href="/producer/wines">
                <Button variant="outline" size="sm" className="rounded-full">
                  View all
                </Button>
              </Link>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {(wines || []).slice(0, 8).map((w, idx) => (
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
                    <div className="text-xs text-gray-500 truncate">
                      {w.handle}
                    </div>
                  </div>
                  <Link href={`/producer/wines/${w.id}`}>
                    <Button variant="outline" size="sm" className="rounded-full">
                      Edit
                    </Button>
                  </Link>
                </div>
              ))}

              {(wines || []).length === 0 && (
                <div className="p-6 text-center">
                  <div className="text-sm text-gray-500">
                    No wines yet. Add your first wine to get started.
                  </div>
                  <div className="mt-4">
                    <Link href="/producer/wines/new">
                      <Button className="bg-black hover:bg-black/90 text-white rounded-full">
                        Add wine
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}


