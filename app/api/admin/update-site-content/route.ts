import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    // Update site_title
    const { error: titleError } = await supabase
      .from('site_content')
      .upsert({
        key: 'site_title',
        value: 'PACT Wines',
        type: 'text',
        description: 'Main site title',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (titleError) {
      console.error('Error updating site_title:', titleError);
      return NextResponse.json({ error: 'Failed to update site_title' }, { status: 500 });
    }

    // Update site_description
    const { error: descError } = await supabase
      .from('site_content')
      .upsert({
        key: 'site_description',
        value: 'Exclusive wine community where members share pallets and discover exceptional wines together',
        type: 'text',
        description: 'Main site description',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (descError) {
      console.error('Error updating site_description:', descError);
      return NextResponse.json({ error: 'Failed to update site_description' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Site content updated successfully',
      updates: {
        site_title: 'PACT Wines',
        site_description: 'Exclusive wine community where members share pallets and discover exceptional wines together'
      }
    });

  } catch (error) {
    console.error('Error updating site content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
