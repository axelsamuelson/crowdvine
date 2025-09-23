import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = getSupabaseAdmin();

    const body = await request.json();
    const { items, ...reservationData } = body;

    console.log('Updating reservation:', id, 'with data:', reservationData);

    // Update the reservation
    const { data: updatedReservation, error: reservationError } = await supabase
      .from('order_reservations')
      .update({
        ...reservationData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (reservationError) {
      console.error('Error updating reservation:', reservationError);
      return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 });
    }

    // Update reservation items
    if (items && Array.isArray(items)) {
      // First, get existing items
      const { data: existingItems } = await supabase
        .from('order_reservation_items')
        .select('id')
        .eq('reservation_id', id);

      const existingItemIds = existingItems?.map(item => item.id) || [];

      // Process each item
      for (const item of items) {
        if (item.id && existingItemIds.includes(item.id)) {
          // Update existing item
          const { error: updateError } = await supabase
            .from('order_reservation_items')
            .update({
              item_id: item.item_id,
              quantity: item.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          if (updateError) {
            console.error('Error updating reservation item:', updateError);
          }
        } else if (item.item_id) {
          // Create new item
          const { error: insertError } = await supabase
            .from('order_reservation_items')
            .insert({
              reservation_id: id,
              item_id: item.item_id,
              quantity: item.quantity,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error('Error creating reservation item:', insertError);
          }
        }
      }

      // Remove items that are no longer in the list
      const newItemIds = items
        .filter(item => item.id && existingItemIds.includes(item.id))
        .map(item => item.id);

      const itemsToDelete = existingItemIds.filter(id => !newItemIds.includes(id));

      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('order_reservation_items')
          .delete()
          .in('id', itemsToDelete);

        if (deleteError) {
          console.error('Error deleting reservation items:', deleteError);
        }
      }
    }

    // Return the updated reservation with items
    const { data: finalReservation } = await supabase
      .from('order_reservations')
      .select(`
        *,
        order_reservation_items(
          *,
          wines(
            id,
            wine_name,
            vintage,
            grape_varieties,
            color,
            base_price_cents,
            label_image_path
          )
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({
      success: true,
      reservation: finalReservation,
    });

  } catch (error) {
    console.error('Reservation update error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = getSupabaseAdmin();

    const { data: reservation, error } = await supabase
      .from('order_reservations')
      .select(`
        *,
        order_reservation_items(
          *,
          wines(
            id,
            wine_name,
            vintage,
            grape_varieties,
            color,
            base_price_cents,
            label_image_path
          )
        ),
        user_addresses(
          address_street,
          address_city,
          address_postcode,
          country_code
        )
      `)
      .eq('id', id)
      .single();

    if (error || !reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    return NextResponse.json({ reservation });

  } catch (error) {
    console.error('Reservation fetch error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
