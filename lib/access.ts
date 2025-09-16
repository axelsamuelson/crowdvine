import { cookies } from "next/headers";

export async function ensureAccessCookie() {
  const jar = await cookies();
  const v = jar.get("cv-access")?.value;
  if (v !== "1") {
    jar.set("cv-access", "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }
}

// Server action for setting access cookie
export async function setAccessCookieAction() {
  "use server";
  await ensureAccessCookie();
}
