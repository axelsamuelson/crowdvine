import { cookies } from "next/headers";
import {
  FIRST_TOUCH_KEY,
  VISITOR_ID_KEY,
  parseFirstTouchPayload,
  type FirstTouch,
} from "@/lib/analytics/visitor-identity";

/** Read visitor identity cookies set by the browser analytics layer. */
export async function readVisitorIdentityFromCookies(): Promise<{
  visitorId: string | null;
  firstTouch: FirstTouch | null;
}> {
  try {
    const jar = await cookies();
    const visitorId = jar.get(VISITOR_ID_KEY)?.value?.trim() || null;
    const firstTouch = parseFirstTouchPayload(
      jar.get(FIRST_TOUCH_KEY)?.value ?? null,
    );
    return { visitorId, firstTouch };
  } catch {
    return { visitorId: null, firstTouch: null };
  }
}
