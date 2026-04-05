import { redirect } from "next/navigation"

/** Tidigare URL; strategy map ligger nu under admin-layout. */
export default function StrategyMapRedirectPage() {
  redirect("/admin/strategy-map")
}
