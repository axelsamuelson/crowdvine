import { TAGS } from "@/lib/constants";
import { getAppUrl, getAppUrlForRequest } from "@/lib/app-url";
import type { Product, Collection, Cart } from "./types";

function apiUrls(base: string) {
  return {
    products: `${base}/api/crowdvine/products`,
    product: (handle: string) => `${base}/api/crowdvine/products/${handle}`,
    collections: `${base}/api/crowdvine/collections`,
    collectionProducts: (id: string) =>
      `${base}/api/crowdvine/collections/${id}/products`,
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

export async function getProducts(params?: {
  limit?: number;
  sortKey?: string;
  reverse?: boolean;
  query?: string;
}): Promise<Product[]> {
  const base = await getAppUrlForRequest();
  const url = new URL(apiUrls(base).products);
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());
  if (params?.query) url.searchParams.set("query", params.query);
  if (params?.sortKey) url.searchParams.set("sortKey", params.sortKey);
  if (params?.reverse)
    url.searchParams.set("reverse", params.reverse.toString());

  return j(await fetch(url.toString(), { next: { tags: [TAGS.products] } }));
}

export async function getProduct(handle: string): Promise<Product | null> {
  try {
    const base = await getAppUrlForRequest();
    return await j(await fetch(apiUrls(base).product(handle)));
  } catch {
    return null;
  }
}

export async function getCollections(): Promise<Collection[]> {
  const base = await getAppUrlForRequest();
  return j(
    await fetch(apiUrls(base).collections, { next: { tags: [TAGS.collections] } }),
  );
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

export async function getCollectionProducts(params: {
  collection: string;
  limit?: number;
  sortKey?: string;
  reverse?: boolean;
  query?: string;
}): Promise<Product[]> {
  // First, get the collection to find the UUID from the handle
  const collection = await getCollection(params.collection);
  if (!collection) {
    console.error(`Collection not found for handle: ${params.collection}`);
    return [];
  }

  const base = await getAppUrlForRequest();
  const url = new URL(apiUrls(base).collectionProducts((collection as any).id));
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());
  if (params?.query) url.searchParams.set("query", params.query);
  if (params?.sortKey) url.searchParams.set("sortKey", params.sortKey);
  if (params?.reverse)
    url.searchParams.set("reverse", params.reverse.toString());

  return j(await fetch(url.toString(), { next: { tags: [TAGS.products] } }));
}

/** Cart-funktioner shimmar till bookings; vi returnerar en ShopifyCart-kompatibel form */
export async function createCart(): Promise<Cart> {
  const base = await getAppUrlForRequest();
  return j(await fetch(apiUrls(base).cartCreate, { method: "POST" }));
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
    await fetch(apiUrls(base).cartAdd(cartId), {
      method: "POST",
      body: JSON.stringify({ lines }),
    }),
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
    await fetch(apiUrls(base).cartUpdate(cartId), {
      method: "POST",
      body: JSON.stringify({ lines }),
    }),
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
    await fetch(apiUrls(base).cartRemove(cartId), {
      method: "POST",
      body: JSON.stringify({ lineIds }),
    }),
  );
}
