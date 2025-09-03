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
  let sessionId = cookieStore.get('cartId')?.value;

  if (!sessionId) {
    const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart`, {
      method: 'POST',
    });
    const cart = await response.json();
    sessionId = cart.id;
    
    // Set the new session ID in cookie
    if (sessionId) {
      cookieStore.set('cartId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }
  }

  return sessionId || '';
}

// Add item server action: returns adapted Cart
export async function addItem(variantId: string | undefined): Promise<Cart | null> {
  if (!variantId) return null;
  
  try {
    // First try to get existing cart
    const getResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart`, {
      method: 'GET',
    });

    let cartId: string;
    let sessionId: string;

    if (getResponse.ok) {
      // Use existing cart
      const existingCart = await getResponse.json();
      cartId = existingCart.id;
      sessionId = existingCart.session_id;
      console.log('Using existing cart:', { cartId, sessionId });
    } else {
      // Create new cart if none exists
      const cartResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart`, {
        method: 'POST',
      });

      if (!cartResponse.ok) {
        const errorData = await cartResponse.json();
        console.error('Cart creation error:', errorData);
        throw new Error(`Failed to create cart: ${cartResponse.status} - ${errorData.error || 'Unknown error'}`);
      }

      const cart = await cartResponse.json();
      cartId = cart.id;
      sessionId = cart.session_id;
      console.log('Created new cart:', { cartId, sessionId });
    }
    
    // Now add the item to the cart (API will handle variant ID conversion)
    const addResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart/${cartId}/lines/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `cartId=${sessionId}`, // Pass session ID in header
      },
      body: JSON.stringify({
        lines: [{ merchandiseId: variantId, quantity: 1 }]
      }),
    });

    if (!addResponse.ok) {
      const errorData = await addResponse.json();
      console.error('Cart add error:', errorData);
      throw new Error(`Failed to add item: ${addResponse.status} - ${errorData.error || 'Unknown error'}`);
    }

    const cartData = await addResponse.json();
    console.log('Cart data after add:', cartData);
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
