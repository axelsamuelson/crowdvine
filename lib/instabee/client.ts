const INSTABEE_BASE_URL =
  process.env.INSTABEE_USE_SANDBOX === "true"
    ? "https://sandbox-api.integration.instabee.com"
    : "https://api.integration.instabee.com";

export async function instabeeRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = process.env.INSTABEE_API_KEY?.trim();
  const customerNumber = process.env.INSTABEE_CUSTOMER_NUMBER?.trim();
  if (!apiKey) throw new Error("INSTABEE_API_KEY is not set");
  if (!customerNumber) {
    throw new Error("INSTABEE_CUSTOMER_NUMBER is not set");
  }

  const url = `${INSTABEE_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      "Content-Type": "application/json",
      "Accept-Version": "1.0.0",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instabee ${res.status} on ${path}: ${body}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function getCustomerNumber(): string {
  const n = process.env.INSTABEE_CUSTOMER_NUMBER?.trim();
  if (!n) throw new Error("INSTABEE_CUSTOMER_NUMBER is not set");
  return n;
}
