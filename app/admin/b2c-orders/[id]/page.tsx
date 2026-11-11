import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolvePaymentMethodDetailsFromId } from "@/lib/stripe/resolve-payment-method-details";
import ReservationEditForm from "@/components/admin/reservation-edit-form";
import { DirectBoxFulfillmentPanel } from "@/components/admin/direct-box-fulfillment-panel";
import type { PickListItemInput } from "@/lib/admin/direct-box-pick-list";

export const metadata = {
  title: "B2C Order",
};

interface B2cOrderEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function B2cOrderEditPage({
  params,
}: B2cOrderEditPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const supabase = getSupabaseAdmin();

  // Get reservation with all related data
  const { data: reservation, error } = await supabase
    .from("order_reservations")
    .select(
      `
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
          label_image_path,
          source_type,
          source_name,
          producer_id,
          region,
          producers(
            id,
            name,
            address_street,
            address_postcode,
            address_city
          )
        )
      ),
      user_addresses(
        address_street,
        address_city,
        address_postcode,
        country_code
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error || !reservation) {
    notFound();
  }

  if (
    !reservation.payment_method_last4 &&
    typeof reservation.payment_method_id === "string" &&
    reservation.payment_method_id.trim()
  ) {
    const paymentMethodDetails = await resolvePaymentMethodDetailsFromId(
      reservation.payment_method_id,
    );
    Object.assign(reservation, paymentMethodDetails);
  }

  // Get available zones for dropdowns
  const { data: zones } = await supabase
    .from("zones")
    .select("id, name, type")
    .order("name");

  // Get available pallets
  const { data: pallets } = await supabase
    .from("pallets")
    .select("id, name, pickup_zone_id, delivery_zone_id")
    .order("name");

  // Get available wines
  const { data: wines } = await supabase
    .from("wines")
    .select(
      "id, wine_name, vintage, grape_varieties, color, base_price_cents, label_image_path",
    )
    .order("wine_name");

  const isDirectBox = reservation.fulfillment_channel === "direct_box";

  let shipments: Array<{
    id: string;
    source_key: string;
    source_label: string;
    carrier: string;
    tracking_number: string;
    boxes: number;
    created_at?: string;
  }> = [];

  if (isDirectBox) {
    const { data: shipmentRows } = await supabase
      .from("order_reservation_shipments")
      .select(
        "id, source_key, source_label, carrier, tracking_number, boxes, created_at",
      )
      .eq("reservation_id", id)
      .order("created_at", { ascending: true });
    shipments = shipmentRows ?? [];
  }

  const pickListItems: PickListItemInput[] = (
    reservation.order_reservation_items ?? []
  ).map(
    (row: {
      quantity?: number | null;
      item_id?: string | null;
      wines?: {
        id?: string;
        wine_name?: string | null;
        vintage?: string | null;
        source_type?: string | null;
        source_name?: string | null;
        producer_id?: string | null;
        region?: string | null;
        producers?: {
          id?: string;
          name?: string | null;
          address_street?: string | null;
          address_postcode?: string | null;
          address_city?: string | null;
        } | null;
      } | null;
    }) => {
      const wine = row.wines;
      const producer = wine?.producers;
      return {
        wineId: wine?.id || row.item_id || "",
        wineName: wine?.wine_name || "Okänt vin",
        vintage: wine?.vintage ?? null,
        quantity: Number(row.quantity) || 0,
        sourceType: wine?.source_type ?? null,
        sourceName: wine?.source_name ?? null,
        producerId: wine?.producer_id ?? producer?.id ?? null,
        producerName: producer?.name ?? null,
        producerAddressStreet: producer?.address_street ?? null,
        producerAddressPostcode: producer?.address_postcode ?? null,
        producerAddressCity: producer?.address_city ?? null,
        region: wine?.region ?? null,
      };
    },
  );

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          B2C Order
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Update reservation details and items
        </p>
      </div>

      {isDirectBox ? (
        <DirectBoxFulfillmentPanel
          reservationId={reservation.id}
          orderCreatedAt={reservation.created_at}
          fulfillmentDispatchStatus={
            reservation.fulfillment_dispatch_status ?? null
          }
          deliveredAt={reservation.delivered_at ?? null}
          statusUpdatedAt={
            reservation.fulfillment_dispatch_status_updated_at ?? null
          }
          items={pickListItems}
          shipments={shipments}
        />
      ) : null}

      <ReservationEditForm
        reservation={reservation}
        zones={zones || []}
        pallets={pallets || []}
        wines={wines || []}
      />
    </div>
  );
}
