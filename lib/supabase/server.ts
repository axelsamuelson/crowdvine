import { cookies, headers } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseServerClient(): SupabaseClient {
  const store = cookies();
  const defaults: CookieOptions = {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => store.get(name)?.value,
        set: (name, value, opts) => {
          store.set({
            name,
            value,
            path: opts?.path ?? defaults.path,
            sameSite: opts?.sameSite ?? defaults.sameSite,
            secure: opts?.secure ?? defaults.secure!,
            httpOnly: opts?.httpOnly ?? defaults.httpOnly!,
            // Domain sätts INTE – host-only för att funka i Vercel preview/prod
            expires: opts?.expires,
            maxAge: opts?.maxAge,
          });
        },
        remove: (name, opts) => {
          store.set({
            name,
            value: "",
            path: opts?.path ?? defaults.path,
            sameSite: opts?.sameSite ?? defaults.sameSite,
            secure: opts?.secure ?? defaults.secure!,
            httpOnly: opts?.httpOnly ?? defaults.httpOnly!,
            maxAge: 0,
          });
        },
      },
      headers: { request: headers() },
    },
  );
}
