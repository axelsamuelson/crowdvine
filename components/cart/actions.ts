'use server';

import { TAGS } from '@/lib/constants';
import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import {
  createCart,
  addCartLines,
  updateCartLines,
  removeCartLines,
} from '@/lib/shopify';
import type { Cart, CartItem } from '@/lib/shopify/types';

// Local adapter utilities to return FE Cart (avoid cyclic deps)
function adaptCartLine(line: any): CartItem {
  return {
    id: line.id,
    quantity: line.quantity,
    cost: {
      totalAmount: {
        amount: (parseFloat(line.price?.amount || '0') * line.quantity).toString(),
        currencyCode: line.price?.currencyCode || 'SEK',
      },
    },
    merchandise: {
      id: line.merchandiseId,
      title: line.title || 'Wine',
      selectedOptions: [],
      product: {
        id: line.merchandiseId,
        title: line.title || 'Wine',
        handle: line.handle || '',
        categoryId: undefined,
        description: '',
        descriptionHtml: '',
        featuredImage: { url: '', altText: '', height: 0, width: 0 },
        currencyCode: 'SEK',
        priceRange: {
          minVariantPrice: { amount: line.price?.amount || '0', currencyCode: 'SEK' },
          maxVariantPrice: { amount: line.price?.amount || '0', currencyCode: 'SEK' },
        },
        compareAtPrice: undefined,
        seo: { title: line.title || 'Wine', description: '' },
        options: [],
        tags: [],
        variants: [],
        images: [],
        availableForSale: true,
      },
    },
  } satisfies CartItem;
}

function adaptCart(crowdvineCart: any): Cart | null {
  if (!crowdvineCart) return null;

  const lines = (crowdvineCart.lines || []).map((line: any) => adaptCartLine(line));

  return {
    id: crowdvineCart.id,
    checkoutUrl: crowdvineCart.checkoutUrl,
    cost: {
      subtotalAmount: { amount: '0', currencyCode: 'SEK' },
      totalAmount: { amount: '0', currencyCode: 'SEK' },
      totalTaxAmount: { amount: '0', currencyCode: 'SEK' },
    },
    totalQuantity: lines.reduce((sum: number, line: CartItem) => sum + line.quantity, 0),
    lines,
  } satisfies Cart;
}

async function getOrCreateCartId(): Promise<string> {
  let cartId = (await cookies()).get('cartId')?.value;
  if (!cartId) {
    const newCart = await createCart();
    cartId = newCart.id;
    (await cookies()).set('cartId', cartId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return cartId;
}

// Add item server action: returns adapted Cart
export async function addItem(variantId: string | undefined): Promise<Cart | null> {
  if (!variantId) return null;
  try {
    const cartId = await getOrCreateCartId();
    await addCartLines({ cartId, lines: [{ merchandiseId: variantId, quantity: 1 }] });
    revalidateTag(TAGS.cart);
    // For now, return a simple cart structure since we don't have getCart
    return {
      id: cartId,
      checkoutUrl: '/checkout',
      cost: {
        subtotalAmount: { amount: '0', currencyCode: 'SEK' },
        totalAmount: { amount: '0', currencyCode: 'SEK' },
        totalTaxAmount: { amount: '0', currencyCode: 'SEK' },
      },
      totalQuantity: 1,
      lines: [],
    };
  } catch (error) {
    console.error('Error adding item to cart:', error);
    return null;
  }
}

// Update item server action (quantity 0 removes): returns adapted Cart
export async function updateItem({ lineId, quantity }: { lineId: string; quantity: number }): Promise<Cart | null> {
  try {
    const cartId = (await cookies()).get('cartId')?.value;
    if (!cartId) return null;

    if (quantity === 0) {
      await removeCartLines({ cartId, lineIds: [lineId] });
    } else {
      await updateCartLines({ cartId, lines: [{ id: lineId, quantity }] });
    }

    revalidateTag(TAGS.cart);
    // For now, return a simple cart structure
    return {
      id: cartId,
      checkoutUrl: '/checkout',
      cost: {
        subtotalAmount: { amount: '0', currencyCode: 'SEK' },
        totalAmount: { amount: '0', currencyCode: 'SEK' },
        totalTaxAmount: { amount: '0', currencyCode: 'SEK' },
      },
      totalQuantity: 0,
      lines: [],
    };
  } catch (error) {
    console.error('Error updating item:', error);
    return null;
  }
}

export async function createCartAndSetCookie() {
  try {
    const newCart = await createCart();

    (await cookies()).set('cartId', newCart.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return newCart;
  } catch (error) {
    console.error('Error creating cart:', error);
    return null;
  }
}

export async function getCart(): Promise<Cart | null> {
  try {
    const cartId = (await cookies()).get('cartId')?.value;

    if (!cartId) {
      return null;
    }
    
    // For now, return a simple cart structure since we don't have getCart
    return {
      id: cartId,
      checkoutUrl: '/checkout',
      cost: {
        subtotalAmount: { amount: '0', currencyCode: 'SEK' },
        totalAmount: { amount: '0', currencyCode: 'SEK' },
        totalTaxAmount: { amount: '0', currencyCode: 'SEK' },
      },
      totalQuantity: 0,
      lines: [],
    };
  } catch (error) {
    console.error('Error fetching cart:', error);
    return null;
  }
}
