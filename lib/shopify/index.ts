import { getAppUrlForRequest, getInternalFetchHeaders } from "@/lib/app-url";
import { fetchCollectionsData } from "@/lib/crowdvine/collections-data";
import {
  fetchProductsData,
  fetchCollectionProductsData,
} from "@/lib/crowdvine/products-data";
import type { Product, Collection, Cart } from "./types";

function apiUrls(base: string) {
  return {
    product: (handle: string) => `${base}/api/crowdvine/products/${handle}`,
    cartCreate: `${base}/api/crowdvine/cart`,
    cartAdd: (id: string) => `${base}/api/crowdvine/cart/${id}/lines/add`,
    cartUpdate: (id: string) =>
      `${base}/api/crowdvine/cart/${id}/lines/update`,
    cartRemove: (id: string) =>
      `${base}/api/crowdvine/cart/${id}/lines/remove`,
  };
}

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

function fetchInit(init?: RequestInit): RequestInit {
  const headers = getInternalFetchHeaders();
  const hasHeaders = Object.keys(headers).length > 0;
  return {
    ...init,
    headers: hasHeaders
      ? { ...headers, ...(init?.headers as Record<string, string>) }
      : init?.headers,
  };
}

/** Direct DB fetch – bypasses HTTP and Vercel Deployment Protection 401. */
export async function getProducts(params?: {
  limit?: number;
  sortKey?: string;
  reverse?: boolean;
  query?: string;
}): Promise<Product[]> {
  const sortKey = params?.sortKey || "RELEVANCE";
  const data = await fetchProductsData({
    limit: params?.limit,
    sortKey: sortKey as "RELEVANCE" | "PRICE" | "CREATED_AT" | "CREATED",
    reverse: params?.reverse,
  });
  return data as Product[];
}

export async function getProduct(handle: string): Promise<Product | null> {
  try {
    const base = await getAppUrlForRequest();
    return await j(await fetch(apiUrls(base).product(handle), fetchInit()));
  } catch {
    return null;
  }
}

/** Direct DB fetch – bypasses HTTP and Vercel Deployment Protection 401. */
export async function getCollections(): Promise<Collection[]> {
  const data = await fetchCollectionsData();
  return data as Collection[];
}

export async function getCollection(
  handle: string,
): Promise<Collection | null> {
  try {
    const collections = await getCollections();
    return collections.find((c) => c.handle === handle) || null;
  } catch {
    return null;
  }
}

/** Direct DB fetch – bypasses HTTP and Vercel Deployment Protection 401. */
export async function getCollectionProducts(params: {
  collection: string;
  limit?: number;
  sortKey?: string;
  reverse?: boolean;
  query?: string;
}): Promise<Product[]> {
  const collection = await getCollection(params.collection);
  if (!collection) {
    console.error(`Collection not found for handle: ${params.collection}`);
    return [];
  }

  const data = await fetchCollectionProductsData((collection as any).id, {
    limit: params?.limit,
  });
  return data as Product[];
}

/** Cart-funktioner shimmar till bookings; vi returnerar en ShopifyCart-kompatibel form */
export async function createCart(): Promise<Cart> {
  const base = await getAppUrlForRequest();
  return j(await fetch(apiUrls(base).cartCreate, fetchInit({ method: "POST" })));
}
interface CartLine {
  merchandiseId: string;
  quantity: number;
}

export async function addCartLines({
  cartId,
  lines,
}: {
  cartId: string;
  lines: CartLine[];
}): Promise<Cart> {
  const base = await getAppUrlForRequest();
  return j(
    await fetch(apiUrls(base).cartAdd(cartId), fetchInit({
      method: "POST",
      body: JSON.stringify({ lines }),
      headers: { "Content-Type": "application/json" },
    })),
  );
}
export async function updateCartLines({
  cartId,
  lines,
}: {
  cartId: string;
  lines: CartLine[];
}): Promise<Cart> {
  const base = await getAppUrlForRequest();
  return j(
    await fetch(apiUrls(base).cartUpdate(cartId), fetchInit({
      method: "POST",
      body: JSON.stringify({ lines }),
      headers: { "Content-Type": "application/json" },
    })),
  );
}
export async function removeCartLines({
  cartId,
  lineIds,
}: {
  cartId: string;
  lineIds: string[];
}): Promise<Cart> {
  const base = await getAppUrlForRequest();
  return j(
    await fetch(apiUrls(base).cartRemove(cartId), fetchInit({
      method: "POST",
      body: JSON.stringify({ lineIds }),
      headers: { "Content-Type": "application/json" },
    })),
  );
}
