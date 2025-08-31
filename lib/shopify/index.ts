import { TAGS } from '@/lib/constants';
import type { Product, Collection, Cart } from './types';

// Vår API-bas (Next API routes som läser Supabase)
const API = {
  products: '/api/crowdvine/products',
  product: (handle: string) => `/api/crowdvine/products/${handle}`,
  collections: '/api/crowdvine/collections',                 // mappar zoner/kampanjer
  collectionProducts: (id: string) => `/api/crowdvine/collections/${id}/products`,
  cartCreate: '/api/crowdvine/cart',
  cartAdd: (id: string) => `/api/crowdvine/cart/${id}/lines/add`,
  cartUpdate: (id: string) => `/api/crowdvine/cart/${id}/lines/update`,
  cartRemove: (id: string) => `/api/crowdvine/cart/${id}/lines/remove`,
};

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
  const url = new URL(API.products, process.env.APP_URL);
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());
  if (params?.query) url.searchParams.set('query', params.query);
  if (params?.sortKey) url.searchParams.set('sortKey', params.sortKey);
  if (params?.reverse) url.searchParams.set('reverse', params.reverse.toString());
  
  return j(await fetch(url.toString(), { next: { tags: [TAGS.products] } }));
}

export async function getProduct(handle: string): Promise<Product | null> {
  try { return await j(await fetch(API.product(handle))); }
  catch { return null; }
}

export async function getCollections(): Promise<Collection[]> {
  return j(await fetch(API.collections, { next: { tags: [TAGS.collections] } }));
}

export async function getCollection(handle: string): Promise<Collection | null> {
  try {
    const collections = await getCollections();
    return collections.find(c => c.handle === handle) || null;
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
  const url = new URL(API.collectionProducts(params.collection), process.env.APP_URL);
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());
  if (params?.query) url.searchParams.set('query', params.query);
  if (params?.sortKey) url.searchParams.set('sortKey', params.sortKey);
  if (params?.reverse) url.searchParams.set('reverse', params.reverse.toString());
  
  return j(await fetch(url.toString(), { next: { tags: [TAGS.products] } }));
}

/** Cart-funktioner shimmar till bookings; vi returnerar en ShopifyCart-kompatibel form */
export async function createCart(): Promise<Cart> {
  return j(await fetch(API.cartCreate, { method: 'POST' }));
}
export async function addCartLines({ cartId, lines }: { cartId: string; lines: any[] }): Promise<Cart> {
  return j(await fetch(API.cartAdd(cartId), { method: 'POST', body: JSON.stringify({ lines }) }));
}
export async function updateCartLines({ cartId, lines }: { cartId: string; lines: any[] }): Promise<Cart> {
  return j(await fetch(API.cartUpdate(cartId), { method: 'POST', body: JSON.stringify({ lines }) }));
}
export async function removeCartLines({ cartId, lineIds }: { cartId: string; lineIds: string[] }): Promise<Cart> {
  return j(await fetch(API.cartRemove(cartId), { method: 'POST', body: JSON.stringify({ lineIds }) }));
}
