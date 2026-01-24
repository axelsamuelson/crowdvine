import Link from "next/link";
import { getWines } from "@/lib/actions/wines";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { AdminWinesContent } from "./admin-wines-content";

export default async function WinesPage() {
  const wines = await getWines();

  const margins = wines
    .map((w) => (w as any).margin_percentage)
    .map((v) => (typeof v === "number" ? v : Number(v)));
  const numericMargins = margins.filter((m) => Number.isFinite(m)) as number[];
  const hasMissing = margins.length > numericMargins.length;

  const first = numericMargins[0];
  const allSame =
    numericMargins.length > 0 &&
    numericMargins.every((m) => Math.abs(m - first) < 1e-9) &&
    !hasMissing;

  const isMixed = wines.length > 0 && !allSame;
  const initialMargin = allSame ? first : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wines</h1>
          <p className="text-gray-600">Manage wine products</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/bulk-upload">
            <Button variant="outline" className="bg-gray-50 hover:bg-gray-100">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
          </Link>
          <Link href="/admin/wines/new">
            <Button>Add Wine</Button>
          </Link>
        </div>
      </div>

      <AdminWinesContent wines={wines} initialMargin={initialMargin} isMixed={isMixed} />
    </div>
  );
}
