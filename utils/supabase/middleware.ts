import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function requestHeadersWithPathname(
  request: NextRequest,
  pathname?: string,
): Headers {
  const headers = new Headers(request.headers);
  if (pathname) {
    headers.set("x-pathname", pathname);
  }
  return headers;
}

function nextWithForwardedCookies(
  request: NextRequest,
  pathname?: string,
): NextResponse {
  return NextResponse.next({
    request: { headers: requestHeadersWithPathname(request, pathname) },
  });
}

export function createClient(request: NextRequest, pathname?: string) {
  let response = nextWithForwardedCookies(request, pathname);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = nextWithForwardedCookies(request, pathname);
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = nextWithForwardedCookies(request, pathname);
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    },
  );

  return { supabase, response };
}
