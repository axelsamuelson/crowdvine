import { cookies } from "next/headers";
import {
  FIRST_TOUCH_KEY,
  GEO_COUNTRY_COOKIE,
  VISITOR_ID_KEY,
  parseFirstTouchPayload,
  type FirstTouch,
} from "@/lib/analytics/visitor-identity";

function parseCountryCode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return null;
  return code;
}

/** Read visitor identity cookies set by the browser analytics layer. */
export async function readVisitorIdentityFromCookies(): Promise<{
  visitorId: string | null;
  firstTouch: FirstTouch | null;
  countryCode: string | null;
}> {
  try {
    const jar = await cookies();
    const visitorId = jar.get(VISITOR_ID_KEY)?.value?.trim() || null;
    const firstTouch = parseFirstTouchPayload(
      jar.get(FIRST_TOUCH_KEY)?.value ?? null,
    );
    const countryCode = parseCountryCode(jar.get(GEO_COUNTRY_COOKIE)?.value);
    return { visitorId, firstTouch, countryCode };
  } catch {
    return { visitorId: null, firstTouch: null, countryCode: null };
  }
}
