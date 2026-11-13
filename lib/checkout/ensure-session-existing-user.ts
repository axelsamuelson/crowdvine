/**
 * Detect whether an auth/profile user already owns this email so open-platform
 * guest checkout never mints a session for an existing account.
 *
 * Detection order (exact, case-insensitive):
 * 1. profiles.email via ilike without wildcards
 * 2. GoTrue admin GET /auth/v1/admin/users?email= (filter not exposed by supabase-js)
 * 3. Paginated auth.admin.listUsers scan for exact CI email match
 *
 * On lookup failure we fail closed (assume exists) so we never hand out tokens.
 */

export function escapeIlikeExact(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

type AdminLike = {
  from: (table: string) => {
    select: (cols: string) => {
      ilike: (
        col: string,
        pattern: string,
      ) => {
        limit: (n: number) => {
          maybeSingle: () => Promise<{
            data: { id: string } | null;
            error: { message?: string } | null;
          }>;
        };
      };
    };
  };
  auth: {
    admin: {
      listUsers: (params?: {
        page?: number;
        perPage?: number;
      }) => Promise<{
        data: { users: Array<{ email?: string | null }> };
        error: { message?: string } | null;
      }>;
    };
  };
};

async function profileOwnsEmail(
  sb: AdminLike,
  email: string,
): Promise<boolean | "error"> {
  const { data, error } = await sb
    .from("profiles")
    .select("id")
    .ilike("email", escapeIlikeExact(email))
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[checkout/ensure-session] profile email lookup:", error);
    return "error";
  }
  return Boolean(data?.id);
}

function userListHasEmail(
  users: Array<{ email?: string | null }> | undefined,
  email: string,
): boolean {
  return (users ?? []).some(
    (u) => (u.email ?? "").trim().toLowerCase() === email,
  );
}

/**
 * GoTrue accepts `email` on admin list users; supabase-js listUsers only
 * forwards page/per_page, so we call the endpoint directly when configured.
 */
export async function authUsersEmailFilterFetch(
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<"exists" | "absent" | "unknown"> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return "unknown";

  try {
    const res = await fetchImpl(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=50`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      console.error(
        "[checkout/ensure-session] auth users?email= status:",
        res.status,
      );
      return "unknown";
    }
    const body = (await res.json()) as {
      users?: Array<{ email?: string | null }>;
    };
    if (userListHasEmail(body.users, email)) return "exists";
    // Empty or non-matching: filter likely applied (or user absent on first page).
    // If GoTrue ignored the filter it may return an unrelated page — caller still
    // runs listUsers scan. Treat non-match here as absent only when the page is
    // empty or every returned email was checked (we already checked).
    if (!body.users || body.users.length === 0) return "absent";
    // Non-empty page without our email → filter may be ignored; defer to scan.
    return "unknown";
  } catch (err) {
    console.error("[checkout/ensure-session] auth users?email=:", err);
    return "unknown";
  }
}

async function listUsersScanHasEmail(
  sb: AdminLike,
  email: string,
): Promise<boolean | "error"> {
  const perPage = 1000;
  const maxPages = 20;
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[checkout/ensure-session] listUsers:", error);
      return "error";
    }
    if (userListHasEmail(data.users, email)) return true;
    if (!data.users || data.users.length < perPage) return false;
  }
  // Exhausted page budget without a match — fail closed.
  return "error";
}

/** Returns true if an existing account owns this email (exact, case-insensitive). */
export async function existingCheckoutEmailTaken(
  sb: AdminLike,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const profile = await profileOwnsEmail(sb, email);
  if (profile === true) return true;
  if (profile === "error") return true;

  const filtered = await authUsersEmailFilterFetch(email, fetchImpl);
  if (filtered === "exists") return true;
  if (filtered === "absent") return false;

  const scanned = await listUsersScanHasEmail(sb, email);
  if (scanned === "error") return true;
  return scanned;
}
