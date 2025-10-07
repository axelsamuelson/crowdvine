import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Migration: Add pallet_id to order_reservations table
 * This makes the pallet-reservation relationship explicit and simple
 */
export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    // Step 1: Add the column (if it doesn't exist)
    console.log("Step 1: Adding pallet_id column...");
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE order_reservations 
        ADD COLUMN IF NOT EXISTS pallet_id UUID;
      `
    });

    if (addColumnError) {
      console.error("Error adding column:", addColumnError);
      // Continue anyway - column might already exist
    }

    // Step 2: Add foreign key constraint (if it doesn't exist)
    console.log("Step 2: Adding foreign key constraint...");
    const { error: fkError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_order_reservations_pallet'
          ) THEN
            ALTER TABLE order_reservations
            ADD CONSTRAINT fk_order_reservations_pallet
            FOREIGN KEY (pallet_id) 
            REFERENCES pallets(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      `
    });

    if (fkError) {
      console.error("Error adding FK:", fkError);
      // Continue anyway
    }

    // Step 3: Create index (if it doesn't exist)
    console.log("Step 3: Creating index...");
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_order_reservations_pallet_id 
        ON order_reservations(pallet_id);
      `
    });

    if (indexError) {
      console.error("Error creating index:", indexError);
      // Continue anyway
    }

    // Step 4: Backfill existing data
    console.log("Step 4: Backfilling data based on zone matching...");
    
    // Get all pallets
    const { data: pallets, error: palletsError } = await supabase
      .from("pallets")
      .select("id, name, pickup_zone_id, delivery_zone_id");

    if (palletsError) {
      throw new Error(`Failed to fetch pallets: ${palletsError.message}`);
    }

    let totalUpdated = 0;
    const results = [];

    for (const pallet of pallets || []) {
      if (!pallet.pickup_zone_id || !pallet.delivery_zone_id) {
        console.log(`Skipping pallet ${pallet.name} - no zones defined`);
        continue;
      }

      // Update reservations that match this pallet's zones
      const { count, error: updateError } = await supabase
        .from("order_reservations")
        .update({ pallet_id: pallet.id })
        .eq("pickup_zone_id", pallet.pickup_zone_id)
        .eq("delivery_zone_id", pallet.delivery_zone_id)
        .is("pallet_id", null);

      if (updateError) {
        console.error(`Error updating for pallet ${pallet.name}:`, updateError);
        results.push({
          pallet: pallet.name,
          status: "error",
          error: updateError.message,
        });
      } else {
        console.log(`Updated ${count} reservations for pallet ${pallet.name}`);
        totalUpdated += count || 0;
        results.push({
          pallet: pallet.name,
          status: "success",
          updated: count || 0,
        });
      }
    }

    // Step 5: Verify
    const { count: totalReservations } = await supabase
      .from("order_reservations")
      .select("*", { count: "exact", head: true });

    const { count: withPallet } = await supabase
      .from("order_reservations")
      .select("*", { count: "exact", head: true })
      .not("pallet_id", "is", null);

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      totalUpdated,
      verification: {
        total_reservations: totalReservations,
        with_pallet_id: withPallet,
        without_pallet_id: (totalReservations || 0) - (withPallet || 0),
      },
      results,
    });

  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Migration failed",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

