import { headers } from "next/headers";
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external";

import { htmlLangForPath, pathnameFromRenderRoute } from "@/lib/i18n/html-lang";
import {
  PACT_LOCALE_HEADER,
  PACT_PATHNAME_HEADER,
} from "@/lib/middleware/request-headers";

/**
 * `<html lang>` for this render.
 *
 * `headers()` on a shared root layout opts every route that is not
 * `force-static` out of static/ISR, and under `force-static` Next returns an
 * empty header list. Prerender therefore uses the page route (the public path
 * for every non-rewritten URL). Dynamic requests read `x-pact-locale` /
 * `x-pathname` from `buildPactRequestHeaders`, which is what keeps rewritten
 * `/en/checkout` in English.
 */
export async function resolveHtmlLang(): Promise<"sv" | "en"> {
  const store = workAsyncStorage.getStore();
  const fromRoute = htmlLangForPath(pathnameFromRenderRoute(store?.route));

  if (store?.forceStatic || store?.isStaticGeneration) {
    return fromRoute;
  }

  try {
    const headerList = await headers();
    const headerLocale = headerList.get(PACT_LOCALE_HEADER);
    if (headerLocale === "en" || headerLocale === "sv") return headerLocale;
    const headerPath = headerList.get(PACT_PATHNAME_HEADER);
    if (headerPath) return htmlLangForPath(headerPath);
  } catch {
    // No request store (static worker). The file route is the page path.
  }

  return fromRoute;
}
