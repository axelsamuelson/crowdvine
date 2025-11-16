import { getProducers } from "@/lib/actions/producers";
import WineForm from "@/components/admin/wine-form";
import { AdminPageShell } from "@/components/admin/admin-page-shell";

export default async function NewWinePage() {
  const producers = await getProducers();

  return (
    <AdminPageShell
      header={{
        title: "Add wine",
        description: "Create a new bottle for the catalog.",
        breadcrumbs: [
          { label: "Catalog", href: "/admin/wines" },
          { label: "New wine" },
        ],
      }}
    >
      <WineForm producers={producers} />
    </AdminPageShell>
  );
}
