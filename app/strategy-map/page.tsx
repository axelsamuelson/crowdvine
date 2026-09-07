import { permanentRedirect } from "next/navigation";

/** Tidigare URL; strategy map ligger nu under admin-layout. */
export default function StrategyMapRedirectPage() {
  permanentRedirect("/admin/strategy-map");
}
