import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Producer Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your account is marked as a producer, but it is not linked to any
              producer record yet. Ask an admin to link your account to a
              producer.
            </p>
          </CardContent>
        </Card>
      </div>
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
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-light text-foreground">
            Producer Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your producer profile and wines.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/producer/profile">
            <Button variant="outline">Edit Profile</Button>
          </Link>
          <Link href="/producer/wines/new">
            <Button>Add Wine</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Producer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="font-medium">{producer?.name || "—"}</div>
            <div className="text-sm text-muted-foreground">
              {producer?.region || ""}
              {producer?.country_code ? ` • ${producer.country_code}` : ""}
            </div>
            {producer?.short_description && (
              <p className="text-sm text-muted-foreground pt-2">
                {producer.short_description}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Wines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {wines?.length || 0} wines
              </p>
              <Link href="/producer/wines">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </div>

            <div className="divide-y border rounded-lg">
              {(wines || []).slice(0, 8).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <div className="font-medium">
                      {w.wine_name}{" "}
                      <span className="text-muted-foreground font-normal">
                        {w.vintage ? `(${w.vintage})` : ""}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {w.handle}
                    </div>
                  </div>
                  <Link href={`/producer/wines/${w.id}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                </div>
              ))}
              {(wines || []).length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No wines yet. Add your first wine to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


