import { TAGS } from '@/lib/constants';
import type { ShopifyProduct, ShopifyCollection, ShopifyCart } from './types';

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

export async function getProducts(): Promise<ShopifyProduct[]> {
  return j(await fetch(API.products, { next: { tags: [TAGS.products] } }));
}

export async function getProduct(handle: string): Promise<ShopifyProduct | null> {
  try { return await j(await fetch(API.product(handle))); }
  catch { return null; }
}

export async function getCollections(): Promise<ShopifyCollection[]> {
  return j(await fetch(API.collections, { next: { tags: [TAGS.collections] } }));
}

export async function getCollectionProducts({ collection }: { collection: string }): Promise<ShopifyProduct[]> {
  return j(await fetch(API.collectionProducts(collection), { next: { tags: [TAGS.products] } }));
}

/** Cart-funktioner shimmar till bookings; vi returnerar en ShopifyCart-kompatibel form */
export async function createCart(): Promise<ShopifyCart> {
  return j(await fetch(API.cartCreate, { method: 'POST' }));
}
export async function addCartLines({ cartId, lines }: { cartId: string; lines: any[] }): Promise<ShopifyCart> {
  return j(await fetch(API.cartAdd(cartId), { method: 'POST', body: JSON.stringify({ lines }) }));
}
export async function updateCartLines({ cartId, lines }: { cartId: string; lines: any[] }): Promise<ShopifyCart> {
  return j(await fetch(API.cartUpdate(cartId), { method: 'POST', body: JSON.stringify({ lines }) }));
}
export async function removeCartLines({ cartId, lineIds }: { cartId: string; lineIds: string[] }): Promise<ShopifyCart> {
  return j(await fetch(API.cartRemove(cartId), { method: 'POST', body: JSON.stringify({ lineIds }) }));
}
