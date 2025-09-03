import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { supabaseServer } from '@/lib/supabase-server';

// Unified cart service that works for both server actions and API routes
export class CartService {
  static async getOrCreateCartId(): Promise<string> {
    const jar = await cookies();
    let cartId = jar.get('cv_cart_id')?.value;

    if (!cartId) {
      cartId = randomUUID();
      jar.set('cv_cart_id', cartId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60*60*24*90
      });
    }

    return cartId;
  }

  static async getCart() {
    const cartId = await this.getOrCreateCartId();
    const sb = await supabaseServer();

    console.log('Getting cart with ID:', cartId);

    const { data: cart, error: cartError } = await sb
      .from('carts')
      .select(`
        id,
        cart_lines (
          id,
          quantity,
          item_id,
          band,
          wines (
            id,
            wine_name,
            vintage,
            label_image_path,
            base_price_cents
          )
        )
      `)
      .eq('id', cartId)
      .single();

    if (cartError || !cart) {
      console.log('Cart not found, returning empty cart');
      return {
        id: cartId,
        lines: [],
        totalQuantity: 0
      };
    }

    // Transform to Shopify-like format
    const lines = (cart.cart_lines || []).map(item => {
      const wine = item.wines as any;
      return {
        id: item.id,
        quantity: item.quantity,
        merchandise: {
          id: item.item_id,
          title: `${wine?.wine_name || 'Unknown Wine'} ${wine?.vintage || ''}`,
          selectedOptions: [],
          product: {
            id: item.item_id,
            title: `${wine?.wine_name || 'Unknown Wine'} ${wine?.vintage || ''}`,
            handle: item.item_id,
            featuredImage: {
              url: wine?.label_image_path || '',
              altText: wine?.wine_name || 'Wine',
              width: 600,
              height: 600
            },
            priceRange: {
              minVariantPrice: {
                amount: ((wine?.base_price_cents || 0) / 100).toString(),
                currencyCode: 'SEK'
              },
              maxVariantPrice: {
                amount: ((wine?.base_price_cents || 0) / 100).toString(),
                currencyCode: 'SEK'
              }
            }
          }
        },
        cost: {
          totalAmount: {
            amount: (((wine?.base_price_cents || 0) * item.quantity) / 100).toString(),
            currencyCode: 'SEK'
          }
        }
      };
    });

    const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

    return {
      id: cart.id,
      lines,
      totalQuantity
    };
  }

  static async addItem(variantId: string, quantity: number = 1) {
    if (!variantId) return null;

    const cartId = await this.getOrCreateCartId();
    const sb = await supabaseServer();

    console.log('Server action - Cart ID:', cartId);

    // First, ensure cart exists
    const { data: existingCart } = await sb
      .from('carts')
      .select('id')
      .eq('id', cartId)
      .single();

    if (!existingCart) {
      // Create cart if it doesn't exist
      await sb
        .from('carts')
        .insert({ id: cartId });
    }

    // Extract actual wine ID from variant ID (remove -default suffix)
    const actualWineId = variantId.replace('-default', '');

    // Check if item already exists in cart
    const { data: existingItem } = await sb
      .from('cart_lines')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('item_id', actualWineId)
      .single();

    if (existingItem) {
      // Update quantity
      const { data: updatedItem, error: updateError } = await sb
        .from('cart_lines')
        .update({
          quantity: existingItem.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id)
        .select(`
          id,
          item_id,
          quantity,
          band,
          wines (
            id,
            wine_name,
            vintage,
            label_image_path,
            base_price_cents
          )
        `)
        .single();

      if (updateError) {
        console.error('Update item error:', updateError);
        throw new Error(`Failed to update item: ${updateError.message}`);
      }

      console.log('Updated item:', updatedItem);
    } else {
      // Add new item
      const { data: newItem, error: insertError } = await sb
        .from('cart_lines')
        .insert({
          cart_id: cartId,
          item_id: actualWineId,
          quantity: quantity,
          band: 'market'
        })
        .select(`
          id,
          item_id,
          quantity,
          band,
          wines (
            id,
            wine_name,
            vintage,
            label_image_path,
            base_price_cents
          )
        `)
        .single();

      if (insertError) {
        console.error('Insert item error:', insertError);
        throw new Error(`Failed to add item: ${insertError.message}`);
      }

      console.log('Added new item:', newItem);
    }

    // Update cart timestamp
    await sb
      .from('carts')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', cartId);

    // Return the updated cart
    return await this.getCart();
  }
}

// Export the old function for backward compatibility
export async function getOrSetCartId() {
  return await CartService.getOrCreateCartId();
}
