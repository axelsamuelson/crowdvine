import { supabaseServer } from '../../lib/supabase-server';
import { getOrSetCartId, clearCartId } from './cookies';
import type { Cart, CartItem } from '../../lib/shopify/types';

export class CartService {
  private static async ensureCart() {
    console.log('=== CART SERVICE ENSURE CART START ===');
    const cartId = await getOrSetCartId();
    console.log('Cart ID from getOrSetCartId:', cartId);
    
    const sb = await supabaseServer();
    console.log('Supabase client initialized for ensureCart');
    
    // Check if cart exists, create if not
    console.log('Checking if cart exists with session_id:', cartId);
    const { data: existingCart, error: checkError } = await sb
      .from('carts')
      .select('id')
      .eq('session_id', cartId)
      .single();
    
    console.log('Cart check result:', { existingCart, checkError });
    
    if (!existingCart) {
      console.log('Cart does not exist, creating new cart');
      const { data: newCart, error } = await sb
        .from('carts')
        .insert({ session_id: cartId })
        .select('id')
        .single();
      
      console.log('Create cart result:', { newCart, error });
      
      if (error) {
        console.error('Failed to create cart:', error);
        throw new Error('Failed to create cart');
      }
      
      console.log('Created new cart with ID:', newCart.id);
      console.log('=== CART SERVICE ENSURE CART END (CREATED) ===');
      return newCart.id;
    }
    
    console.log('Cart exists with ID:', existingCart.id);
    console.log('=== CART SERVICE ENSURE CART END (EXISTS) ===');
    return existingCart.id;
  }

  static async getCart(): Promise<Cart | null> {
    console.log('=== CART SERVICE GET CART START ===');
    try {
      console.log('CartService.getCart called');
      const cartId = await getOrSetCartId();
      console.log('Cart ID from getOrSetCartId:', cartId);
      
      const sb = await supabaseServer();
      console.log('Supabase client initialized for getCart');
      
      console.log('Querying cart_items for cart_id:', cartId);
      const { data: cartItems, error } = await sb
        .from('cart_items')
        .select(`
          id,
          quantity,
          wines (
            id,
            handle,
            wine_name,
            vintage,
            label_image_path,
            base_price_cents
          )
        `)
        .eq('cart_id', (await this.ensureCart()))
        .order('created_at', { ascending: false });
      
      console.log('Cart items query result:', { cartItems, error });
      
      if (error) {
        console.error('Failed to get cart items:', error);
        console.log('=== CART SERVICE GET CART END (ERROR) ===');
        return null;
      }
      
      if (!cartItems || cartItems.length === 0) {
        console.log('No cart items found, returning empty cart');
        const emptyCart = {
          id: await this.ensureCart(), // Use the actual database cart ID
          checkoutUrl: '/checkout',
          cost: {
            subtotalAmount: { amount: '0.00', currencyCode: 'SEK' },
            totalAmount: { amount: '0.00', currencyCode: 'SEK' },
            totalTaxAmount: { amount: '0.00', currencyCode: 'SEK' }
          },
          totalQuantity: 0,
          lines: []
        };
        console.log('Empty cart result:', emptyCart);
        console.log('=== CART SERVICE GET CART END (EMPTY) ===');
        return emptyCart;
      }
      
      console.log('Processing', cartItems.length, 'cart items');
      const lines: CartItem[] = cartItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        cost: {
          totalAmount: {
            amount: ((item.wines.base_price_cents * item.quantity) / 100).toFixed(2),
            currencyCode: 'SEK'
          }
        },
        merchandise: {
          id: item.wines.id,
          title: `${item.wines.wine_name} ${item.wines.vintage}`,
          selectedOptions: [],
          product: {
            id: item.wines.id,
            title: `${item.wines.wine_name} ${item.wines.vintage}`,
            handle: item.wines.handle,
            description: '',
            descriptionHtml: '',
            productType: 'wine',
            categoryId: '',
            options: [],
            variants: [{
              id: `${item.wines.id}-default`,
              title: '750 ml',
              availableForSale: true,
              price: {
                amount: (item.wines.base_price_cents / 100).toFixed(2),
                currencyCode: 'SEK'
              },
              selectedOptions: []
            }],
            priceRange: {
              minVariantPrice: {
                amount: (item.wines.base_price_cents / 100).toFixed(2),
                currencyCode: 'SEK'
              },
              maxVariantPrice: {
                amount: (item.wines.base_price_cents / 100).toFixed(2),
                currencyCode: 'SEK'
              }
            },
            featuredImage: {
              id: `${item.wines.id}-img`,
              url: item.wines.label_image_path,
              altText: item.wines.wine_name,
              width: 600,
              height: 600
            },
            images: [{
              id: `${item.wines.id}-img`,
              url: item.wines.label_image_path,
              altText: item.wines.wine_name,
              width: 600,
              height: 600
            }],
            seo: { title: item.wines.wine_name, description: '' },
            tags: [],
            availableForSale: true,
            currencyCode: 'SEK',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
        }
      }));
      
      const subtotal = lines.reduce((sum, line) => 
        sum + parseFloat(line.cost.totalAmount.amount), 0
      );
      
      const result = {
        id: await this.ensureCart(), // Use the actual database cart ID
        checkoutUrl: '/checkout',
        cost: {
          subtotalAmount: { amount: subtotal.toFixed(2), currencyCode: 'SEK' },
          totalAmount: { amount: subtotal.toFixed(2), currencyCode: 'SEK' },
          totalTaxAmount: { amount: '0.00', currencyCode: 'SEK' }
        },
        totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
        lines
      };
      
      console.log('Final cart result:', result);
      console.log('=== CART SERVICE GET CART END (SUCCESS) ===');
      return result;
    } catch (error) {
      console.error('=== CART SERVICE GET CART ERROR ===');
      console.error('CartService.getCart error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('=== CART SERVICE GET CART ERROR END ===');
      return null;
    }
  }

  static async addItem(wineId: string, quantity: number = 1): Promise<Cart | null> {
    console.log('=== CART SERVICE ADD ITEM START ===');
    try {
      console.log('CartService.addItem called with:', { wineId, quantity });
      
      const cartId = await this.ensureCart();
      console.log('Cart ID from ensureCart:', cartId);
      
      const sb = await supabaseServer();
      console.log('Supabase client initialized');
      
      // Check if item already exists in cart
      console.log('Checking for existing item with wine_id:', wineId);
      const { data: existingItem, error: checkError } = await sb
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('wine_id', wineId)
        .single();
      
      console.log('Existing item check result:', { existingItem, checkError });
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing item:', checkError);
      }
      
      console.log('Existing item result:', existingItem);
      
      if (existingItem) {
        // Update quantity
        console.log('Updating existing item quantity from', existingItem.quantity, 'to', existingItem.quantity + quantity);
        const { data: updatedItem, error: updateError } = await sb
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id)
          .select('*')
          .single();
        
        console.log('Update result:', { updatedItem, updateError });
        
        if (updateError) {
          console.error('Failed to update cart item:', updateError);
          throw new Error('Failed to update cart item');
        }
        console.log('Successfully updated item quantity');
      } else {
        // Add new item
        console.log('Adding new item to cart:', { cart_id: cartId, wine_id: wineId, quantity });
        const { data: newItem, error: insertError } = await sb
          .from('cart_items')
          .insert({
            cart_id: cartId,
            wine_id: wineId,
            quantity
          })
          .select('*')
          .single();
        
        console.log('Insert result:', { newItem, insertError });
        
        if (insertError) {
          console.error('Failed to add cart item:', insertError);
          throw new Error('Failed to add cart item');
        }
        console.log('Successfully added new item:', newItem);
      }
      
      console.log('Calling getCart to return final cart...');
      const cart = await this.getCart();
      console.log('Final cart result:', cart);
      console.log('=== CART SERVICE ADD ITEM END ===');
      return cart;
    } catch (error) {
      console.error('=== CART SERVICE ADD ITEM ERROR ===');
      console.error('CartService.addItem error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('=== CART SERVICE ADD ITEM ERROR END ===');
      return null;
    }
  }

  static async updateItem(itemId: string, quantity: number): Promise<Cart | null> {
    try {
      const sb = await supabaseServer();
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        const { error } = await sb
          .from('cart_items')
          .delete()
          .eq('id', itemId);
        
        if (error) {
          console.error('Failed to remove cart item:', error);
          throw new Error('Failed to remove cart item');
        }
      } else {
        // Update quantity
        const { error } = await sb
          .from('cart_items')
          .update({ quantity })
          .eq('id', itemId);
        
        if (error) {
          console.error('Failed to update cart item:', error);
          throw new Error('Failed to update cart item');
        }
      }
      
      return await this.getCart();
    } catch (error) {
      console.error('CartService.updateItem error:', error);
      return null;
    }
  }

  static async removeItem(itemId: string): Promise<Cart | null> {
    try {
      const sb = await supabaseServer();
      
      const { error } = await sb
        .from('cart_items')
        .delete()
        .eq('id', itemId);
      
      if (error) {
        console.error('Failed to remove cart item:', error);
        throw new Error('Failed to remove cart item');
      }
      
      return await this.getCart();
    } catch (error) {
      console.error('CartService.removeItem error:', error);
      return null;
    }
  }

  static async clearCart(): Promise<void> {
    try {
      const cartId = await getOrSetCartId();
      const sb = await supabaseServer();
      
      const { error } = await sb
        .from('cart_items')
        .delete()
        .eq('cart_id', (await this.ensureCart()));
      
      if (error) {
        console.error('Failed to clear cart:', error);
        throw new Error('Failed to clear cart');
      }
    } catch (error) {
      console.error('CartService.clearCart error:', error);
      throw error;
    }
  }
}
