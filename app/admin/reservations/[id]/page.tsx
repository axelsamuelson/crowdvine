import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import ReservationEditForm from "@/components/admin/reservation-edit-form";

interface ReservationEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservationEditPage({ params }: ReservationEditPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  const supabase = getSupabaseAdmin();
  
  // Get reservation with all related data
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
    notFound();
  }

  // Get available zones for dropdowns
  const { data: zones } = await supabase
    .from('zones')
    .select('id, name, type')
    .order('name');

  // Get available pallets
  const { data: pallets } = await supabase
    .from('pallets')
    .select('id, name, pickup_zone_id, delivery_zone_id')
    .order('name');

  // Get available wines
  const { data: wines } = await supabase
    .from('wines')
    .select('id, wine_name, vintage, grape_varieties, color, base_price_cents, label_image_path')
    .order('wine_name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Reservation</h1>
        <p className="text-gray-600">Update reservation details and items</p>
      </div>

      <ReservationEditForm
        reservation={reservation}
        zones={zones || []}
        pallets={pallets || []}
        wines={wines || []}
      />
    </div>
  );
}
