import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-light text-foreground">Your Wines</h1>
          <p className="text-sm text-muted-foreground">
            Manage wines connected to your producer account.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/producer">
            <Button variant="outline">Back</Button>
          </Link>
          <Link href="/producer/wines/new">
            <Button>Add Wine</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wines ({wines?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y border rounded-lg">
            {(wines || []).map((w) => (
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
                  <div className="text-xs text-muted-foreground">{w.handle}</div>
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
                No wines yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


