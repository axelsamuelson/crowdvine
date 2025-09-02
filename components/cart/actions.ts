'use server';

import { TAGS } from '@/lib/constants';
import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import type { Cart, CartItem } from '@/lib/shopify/types';

// Local adapter utilities to return FE Cart (avoid cyclic deps)
function adaptCartLine(line: any): CartItem {
  return {
    id: line.id,
    quantity: line.quantity,
    cost: {
      totalAmount: {
        amount: line.cost?.totalAmount?.amount || '0',
        currencyCode: line.cost?.totalAmount?.currencyCode || 'SEK',
      },
    },
    merchandise: {
      id: line.merchandise?.id || line.wine_id,
      title: line.merchandise?.title || line.wines?.wine_name || 'Wine',
      selectedOptions: [],
      product: {
        id: line.merchandise?.id || line.wine_id,
        title: line.merchandise?.title || line.wines?.wine_name || 'Wine',
        handle: line.merchandise?.id || line.wine_id,
        categoryId: undefined,
        description: '',
        descriptionHtml: '',
        featuredImage: { 
          url: line.merchandise?.product?.featuredImage?.url || line.wines?.label_image_path || '', 
          altText: line.merchandise?.product?.featuredImage?.altText || line.wines?.wine_name || '',
          height: 600,
          width: 600
        },
        currencyCode: 'SEK',
        priceRange: {
          minVariantPrice: { 
            amount: line.merchandise?.product?.priceRange?.minVariantPrice?.amount || '0', 
            currencyCode: 'SEK' 
          },
          maxVariantPrice: { 
            amount: line.merchandise?.product?.priceRange?.maxVariantPrice?.amount || '0', 
            currencyCode: 'SEK' 
          },
        },
        compareAtPrice: undefined,
        seo: { title: line.merchandise?.title || line.wines?.wine_name || 'Wine', description: '' },
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

  const lines = (crowdvineCart.lines || []).map(adaptCartLine);

  return {
    id: crowdvineCart.id,
    checkoutUrl: crowdvineCart.checkoutUrl || '/checkout',
    cost: {
      subtotalAmount: { 
        amount: crowdvineCart.cost?.totalAmount?.amount || '0', 
        currencyCode: 'SEK' 
      },
      totalAmount: { 
        amount: crowdvineCart.cost?.totalAmount?.amount || '0', 
        currencyCode: 'SEK' 
      },
      totalTaxAmount: { amount: '0', currencyCode: 'SEK' },
    },
    totalQuantity: crowdvineCart.totalQuantity || 0,
    lines,
  };
}

async function getOrCreateCartId(): Promise<string> {
  const cookieStore = await cookies();
  let cartId = cookieStore.get('cartId')?.value;

  if (!cartId) {
    const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart`, {
      method: 'POST',
    });
    const cart = await response.json();
    cartId = cart.id;
    
    // Set the new cart ID in cookie
    if (cartId) {
      cookieStore.set('cartId', cartId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }
  }

  return cartId || '';
}

// Add item server action: returns adapted Cart
export async function addItem(variantId: string | undefined): Promise<Cart | null> {
  if (!variantId) return null;
  try {
    const cartId = await getOrCreateCartId();
    
    const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart/${cartId}/lines/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lines: [{ merchandiseId: variantId, quantity: 1 }]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cart add error:', errorData);
      throw new Error(`Failed to add item: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const cartData = await response.json();
    revalidateTag(TAGS.cart);
    return adaptCart(cartData);
  } catch (error) {
    console.error('Error adding item to cart:', error);
    return null;
  }
}

// Update item server action (quantity 0 removes): returns adapted Cart
export async function updateItem({ lineId, quantity }: { lineId: string; quantity: number }): Promise<Cart | null> {
  try {
    const cartId = await getOrCreateCartId();
    
    if (quantity === 0) {
      // Remove item
      const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart/${cartId}/lines/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineIds: [lineId]
        }),
      });
    } else {
      // Update quantity
      const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart/${cartId}/lines/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lines: [{ id: lineId, quantity }]
        }),
      });
    }

    revalidateTag(TAGS.cart);
    
    // Get updated cart
    const cartResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart`);
    const cartData = await cartResponse.json();
    return adaptCart(cartData);
  } catch (error) {
    console.error('Error updating item:', error);
    return null;
  }
}

export async function createCartAndSetCookie() {
  try {
    const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart`, {
      method: 'POST',
    });
    const cart = await response.json();
    return cart;
  } catch (error) {
    console.error('Error creating cart:', error);
    return null;
  }
}

export async function getCart(): Promise<Cart | null> {
  try {
    const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart`);
    
    if (!response.ok) {
      return null;
    }
    
    const cartData = await response.json();
    return adaptCart(cartData);
  } catch (error) {
    console.error('Error fetching cart:', error);
    return null;
  }
}
