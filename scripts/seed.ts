import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Use service role key for seeding (local only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log('🌱 Starting seed...');

  try {
    // 1. Create producer in Languedoc (near Béziers)
    const producer = {
      id: randomUUID(),
      name: 'Domaine de la Clape',
      region: 'Languedoc',
      latitude: 43.3444, // Near Béziers
      longitude: 3.2169,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: producerError } = await supabase
      .from('producers')
      .insert(producer);

    if (producerError) {
      console.error('❌ Producer error:', producerError);
      return;
    }
    console.log('✅ Producer created:', producer.name);

    // 2. Create zone (Béziers 500 km)
    const zone = {
      id: randomUUID(),
      name: 'Béziers 500 km',
      radius_km: 500,
      center_latitude: 43.3444,
      center_longitude: 3.2169,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: zoneError } = await supabase
      .from('zones')
      .insert(zone);

    if (zoneError) {
      console.error('❌ Zone error:', zoneError);
      return;
    }
    console.log('✅ Zone created:', zone.name);

    // 3. Create membership
    const membership = {
      id: randomUUID(),
      name: 'Premium Membership',
      description: 'Access to exclusive wine campaigns',
      price_cents: 5000, // 50 SEK
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: membershipError } = await supabase
      .from('memberships')
      .insert(membership);

    if (membershipError) {
      console.error('❌ Membership error:', membershipError);
      return;
    }
    console.log('✅ Membership created:', membership.name);

    // 4. Create campaign
    const campaign = {
      id: randomUUID(),
      title: 'Languedoc Classics',
      description: 'Discover the finest wines from Languedoc',
      status: 'live',
      zone_id: zone.id,
      producer_id: producer.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: campaignError } = await supabase
      .from('campaigns')
      .insert(campaign);

    if (campaignError) {
      console.error('❌ Campaign error:', campaignError);
      return;
    }
    console.log('✅ Campaign created:', campaign.title);

    // 5. Create 3 campaign items (wines)
    const wines = [
      {
        id: randomUUID(),
        handle: 'domaine-clape-rouge-2020',
        wine_name: 'Domaine de la Clape Rouge',
        vintage: '2020',
        grape_varieties: 'Syrah, Grenache, Mourvèdre',
        color: 'red',
        label_image_path: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop',
        price_t100_cents: 15000, // 150 SEK
        price_t200_cents: 14000,
        price_t300_cents: 13000,
        price_t400_cents: 12000,
        price_t500_cents: 11000,
        price_t600_cents: 10000,
        price_t700_cents: 9000,
        campaign_id: campaign.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        handle: 'domaine-clape-blanc-2021',
        wine_name: 'Domaine de la Clape Blanc',
        vintage: '2021',
        grape_varieties: 'Grenache Blanc, Roussanne',
        color: 'white',
        label_image_path: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b5d?w=600&h=600&fit=crop',
        price_t100_cents: 18000, // 180 SEK
        price_t200_cents: 17000,
        price_t300_cents: 16000,
        price_t400_cents: 15000,
        price_t500_cents: 14000,
        price_t600_cents: 13000,
        price_t700_cents: 12000,
        campaign_id: campaign.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        handle: 'domaine-clape-rose-2022',
        wine_name: 'Domaine de la Clape Rosé',
        vintage: '2022',
        grape_varieties: 'Grenache, Cinsault',
        color: 'rose',
        label_image_path: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b5d?w=600&h=600&fit=crop',
        price_t100_cents: 12000, // 120 SEK
        price_t200_cents: 11000,
        price_t300_cents: 10000,
        price_t400_cents: 9000,
        price_t500_cents: 8000,
        price_t600_cents: 7000,
        price_t700_cents: 6000,
        campaign_id: campaign.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const wine of wines) {
      const { error: wineError } = await supabase
        .from('campaign_items')
        .insert(wine);

      if (wineError) {
        console.error('❌ Wine error:', wineError);
        return;
      }
      console.log('✅ Wine created:', wine.wine_name);
    }

    console.log('🎉 Seed completed successfully!');
    console.log('\n📋 Created:');
    console.log(`- Producer: ${producer.name}`);
    console.log(`- Zone: ${zone.name}`);
    console.log(`- Membership: ${membership.name}`);
    console.log(`- Campaign: ${campaign.title}`);
    console.log(`- Wines: ${wines.length} items`);
    console.log('\n🔗 Test URLs:');
    console.log(`- Shop: http://localhost:3000/shop`);
    console.log(`- Product: http://localhost:3000/product/${wines[0].handle}`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
  }
}

// Run seed if called directly
if (require.main === module) {
  seed();
}

export { seed };
