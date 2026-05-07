import { redirect } from "next/navigation";

/** Tidigare publik väg — vin-sökning finns nu under admin. */
export default function WineSearchRedirectPage() {
  redirect("/admin/wine-search");
}
