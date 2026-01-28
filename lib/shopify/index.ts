import { TAGS } from "@/lib/constants";
import type { Product, Collection, Cart } from "./types";

// Vår API-bas (Next API routes som läser Supabase)
const getApiBase = () => {
  // On server-side, use relative URLs to avoid port issues
  if (typeof window === "undefined") {
    // Use relative URLs on server-side - Next.js will handle routing internally
    return "";
  }
  
  // On client-side, use the public URL or current origin
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  
  // Ensure protocol is included
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return base.trim();
  }
  // Default to https for production, http for localhost
  return base.includes("localhost") ? `http://${base.trim()}` : `https://${base.trim()}`;
};

const getApiUrl = (path: string) => {
  const base = getApiBase();
  return base ? `${base}${path}` : path;
};

const API = {
  products: () => getApiUrl("/api/crowdvine/products"),
  product: (handle: string) => getApiUrl(`/api/crowdvine/products/${handle}`),
  collections: () => getApiUrl("/api/crowdvine/collections"), // mappar zoner/kampanjer
  collectionProducts: (id: string) =>
    getApiUrl(`/api/crowdvine/collections/${id}/products`),
  cartCreate: () => getApiUrl("/api/crowdvine/cart"),
  cartAdd: (id: string) => getApiUrl(`/api/crowdvine/cart/${id}/lines/add`),
  cartUpdate: (id: string) =>
    getApiUrl(`/api/crowdvine/cart/${id}/lines/update`),
  cartRemove: (id: string) =>
    getApiUrl(`/api/crowdvine/cart/${id}/lines/remove`),
};

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const url = res.url || "unknown";
    const statusText = res.statusText || "Unknown error";
    console.error(`API Error ${res.status} ${statusText} for ${url}`);
    throw new Error(`API ${res.status}: ${statusText} - ${url}`);
  }
  return res.json() as Promise<T>;
}

export async function getProducts(params?: {
  limit?: number;
  sortKey?: string;
  reverse?: boolean;
  query?: string;
}): Promise<Product[]> {
  const baseUrl = API.products();
  const url = new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());
  if (params?.query) url.searchParams.set("query", params.query);
  if (params?.sortKey) url.searchParams.set("sortKey", params.sortKey);
  if (params?.reverse)
    url.searchParams.set("reverse", params.reverse.toString());

  return j(await fetch(url.toString(), { next: { tags: [TAGS.products] } }));
}

export async function getProduct(handle: string): Promise<Product | null> {
  try {
    const url = API.product(handle);
    const fullUrl = typeof window !== "undefined" 
      ? url 
      : url.startsWith("http") 
        ? url 
        : `http://localhost:${process.env.PORT || "3000"}${url}`;
    return await j(await fetch(fullUrl));
  } catch {
    return null;
  }
}

export async function getCollections(): Promise<Collection[]> {
  try {
    const url = API.collections();
    // On server-side, use absolute URL with current port
    const fullUrl = typeof window !== "undefined" 
      ? url 
      : url.startsWith("http") 
        ? url 
        : `http://localhost:${process.env.PORT || "3000"}${url}`;
    console.log("Fetching collections from:", fullUrl);
    const response = await fetch(fullUrl, { 
      next: { tags: [TAGS.collections] },
      cache: "no-store" // Temporary: force fresh fetch to debug
    });
    console.log("Collections response status:", response.status);
    return j(response);
  } catch (error) {
    console.error("Error in getCollections:", error);
    // Return empty array instead of throwing to prevent page crash
    return [];
  }
}

export async function getCollection(
  handle: string,
): Promise<Collection | null> {
  try {
    const collections = await getCollections();
    return collections.find((c) => c.handle === handle) || null;
  } catch (error) {
    console.error("Error in getCollection:", error);
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

  const baseUrl = API.collectionProducts((collection as any).id);
  const url = new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());
  if (params?.query) url.searchParams.set("query", params.query);
  if (params?.sortKey) url.searchParams.set("sortKey", params.sortKey);
  if (params?.reverse)
    url.searchParams.set("reverse", params.reverse.toString());

  return j(await fetch(url.toString(), { next: { tags: [TAGS.products] } }));
}

/** Cart-funktioner shimmar till bookings; vi returnerar en ShopifyCart-kompatibel form */
export async function createCart(): Promise<Cart> {
  const url = API.cartCreate();
  const fullUrl = typeof window !== "undefined" 
    ? url 
    : url.startsWith("http") 
      ? url 
      : `http://localhost:${process.env.PORT || "3000"}${url}`;
  return j(await fetch(fullUrl, { method: "POST" }));
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
  const url = API.cartAdd(cartId);
  const fullUrl = typeof window !== "undefined" 
    ? url 
    : url.startsWith("http") 
      ? url 
      : `http://localhost:${process.env.PORT || "3000"}${url}`;
  return j(
    await fetch(fullUrl, {
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
  const url = API.cartUpdate(cartId);
  const fullUrl = typeof window !== "undefined" 
    ? url 
    : url.startsWith("http") 
      ? url 
      : `http://localhost:${process.env.PORT || "3000"}${url}`;
  return j(
    await fetch(fullUrl, {
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
  const url = API.cartRemove(cartId);
  const fullUrl = typeof window !== "undefined" 
    ? url 
    : url.startsWith("http") 
      ? url 
      : `http://localhost:${process.env.PORT || "3000"}${url}`;
  return j(
    await fetch(fullUrl, {
      method: "POST",
      body: JSON.stringify({ lineIds }),
    }),
  );
}
