import { getAppUrl, getInternalFetchHeaders } from "@/lib/app-url";

function catalogAuthHeaders(): Headers {
  const key = process.env.MCP_API_KEY?.trim();
  if (!key) {
    throw new Error("MCP_API_KEY is not configured");
  }
  const headers = new Headers({
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  });
  for (const [k, v] of Object.entries(getInternalFetchHeaders())) {
    headers.set(k, v);
  }
  return headers;
}

export async function catalogApiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = catalogAuthHeaders();
  if (init?.headers) {
    const extra = new Headers(init.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }
  return fetch(`${getAppUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function catalogApiJson<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const res = await catalogApiFetch(path, init);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : res.statusText || `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: err };
  }
  return { ok: true, data: body as T };
}
