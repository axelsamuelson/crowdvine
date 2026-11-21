import { permanentRedirect } from "next/navigation";

/** Dead page — send everyone to the real admin login. */
export default function UnauthorizedPage() {
  permanentRedirect("/admin-auth/login");
}
