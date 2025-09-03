'use server';

import { TAGS } from '@/lib/constants';
import { revalidateTag } from 'next/cache';
import { CartService } from '@/lib/cart-service';
import type { Cart, CartItem } from '@/lib/shopify/types';

// Helper function to transform CartService result to Shopify CartItem
function transformToCartItem(line: any): CartItem {
  return {
    id: line.id,
    quantity: line.quantity,
    cost: {
      totalAmount: {
        amount: line.cost.totalAmount.amount,
        currencyCode: line.cost.totalAmount.currencyCode,
      },
    },
    merchandise: {
      id: line.merchandise.id,
      title: line.merchandise.title,
      selectedOptions: line.merchandise.selectedOptions,
      product: {
        id: line.merchandise.product.id,
        title: line.merchandise.product.title,
        handle: line.merchandise.product.handle,
        categoryId: undefined,
        description: '',
        descriptionHtml: '',
        featuredImage: line.merchandise.product.featuredImage,
        currencyCode: 'SEK',
        priceRange: line.merchandise.product.priceRange,
        compareAtPrice: undefined,
        seo: { title: line.merchandise.product.title, description: '' },
        options: [],
        tags: [],
        variants: [],
        images: [],
        availableForSale: true,
      },
    },
  };
}

// Add item server action: returns adapted Cart
export async function addItem(variantId: string | undefined): Promise<Cart | null> {
  if (!variantId) return null;
  
  try {
    const result = await CartService.addItem(variantId, 1);
    
    if (result) {
      // Transform to Shopify Cart format
      const cart: Cart = {
        id: result.id,
        checkoutUrl: '/checkout',
        cost: {
          subtotalAmount: { 
            amount: result.lines.reduce((sum, line) => sum + parseFloat(line.cost.totalAmount.amount), 0).toString(), 
            currencyCode: 'SEK' 
          },
          totalAmount: { 
            amount: result.lines.reduce((sum, line) => sum + parseFloat(line.cost.totalAmount.amount), 0).toString(), 
            currencyCode: 'SEK' 
          },
          totalTaxAmount: { amount: '0', currencyCode: 'SEK' },
        },
        totalQuantity: result.totalQuantity,
        lines: result.lines.map(transformToCartItem),
      };
      
      revalidateTag(TAGS.cart);
      return cart;
    }
    
    return null;
  } catch (error) {
    console.error('Add item error:', error);
    throw error;
  }
}

// Update item server action (quantity 0 removes): returns adapted Cart
export async function updateItem({ lineId, quantity }: { lineId: string; quantity: number }): Promise<Cart | null> {
  try {
    const cartId = await CartService.getOrCreateCartId();
    const sb = await (await import('@/lib/supabase-server')).supabaseServer();
    
    if (quantity === 0) {
      // Remove item
      const { error: removeError } = await sb
        .from('cart_lines')
        .delete()
        .eq('id', lineId)
        .eq('cart_id', cartId);
        
      if (removeError) {
        console.error('Remove item error:', removeError);
        throw new Error(`Failed to remove item: ${removeError.message}`);
      }
    } else {
      // Update quantity
      const { error: updateError } = await sb
        .from('cart_lines')
        .update({ quantity })
        .eq('id', lineId)
        .eq('cart_id', cartId);
        
      if (updateError) {
        console.error('Update item error:', updateError);
        throw new Error(`Failed to update item: ${updateError.message}`);
      }
    }

    revalidateTag(TAGS.cart);
    
    // Get updated cart using CartService
    const result = await CartService.getCart();
    
    if (result) {
      // Transform to Shopify Cart format
      const cart: Cart = {
        id: result.id,
        checkoutUrl: '/checkout',
        cost: {
          subtotalAmount: { 
            amount: result.lines.reduce((sum, line) => sum + parseFloat(line.cost.totalAmount.amount), 0).toString(), 
            currencyCode: 'SEK' 
          },
          totalAmount: { 
            amount: result.lines.reduce((sum, line) => sum + parseFloat(line.cost.totalAmount.amount), 0).toString(), 
            currencyCode: 'SEK' 
          },
          totalTaxAmount: { amount: '0', currencyCode: 'SEK' },
        },
        totalQuantity: result.totalQuantity,
        lines: result.lines.map(transformToCartItem),
      };
      
      return cart;
    }
    
    return null;
  } catch (error) {
    console.error('Error updating item:', error);
    return null;
  }
}

export async function createCartAndSetCookie() {
  try {
    const cartId = await CartService.getOrCreateCartId();
    return { id: cartId };
  } catch (error) {
    console.error('Error creating cart:', error);
    return null;
  }
}

export async function getCart(): Promise<Cart | null> {
  try {
    const result = await CartService.getCart();
    
    if (result) {
      // Transform to Shopify Cart format
      const cart: Cart = {
        id: result.id,
        checkoutUrl: '/checkout',
        cost: {
          subtotalAmount: { 
            amount: result.lines.reduce((sum, line) => sum + parseFloat(line.cost.totalAmount.amount), 0).toString(), 
            currencyCode: 'SEK' 
          },
          totalAmount: { 
            amount: result.lines.reduce((sum, line) => sum + parseFloat(line.cost.totalAmount.amount), 0).toString(), 
            currencyCode: 'SEK' 
          },
          totalTaxAmount: { amount: '0', currencyCode: 'SEK' },
        },
        totalQuantity: result.totalQuantity,
        lines: result.lines.map(transformToCartItem),
      };
      
      return cart;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching cart:', error);
    return null;
  }
}
