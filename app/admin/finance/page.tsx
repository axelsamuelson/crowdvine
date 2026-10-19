import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Finans landar på Utfall; övriga vyer är egna undersidor. */
export default function AdminFinancePage() {
  redirect("/admin/finance/utfall");
}
