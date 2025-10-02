import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: "Only CSV files are supported" },
        { status: 400 }
      );
    }

    // Read CSV content
    const csvContent = await file.text();
    const { products, errors } = await parseCSV(csvContent);
    
    if (errors.length > 0) {
      return NextResponse.json({
        error: "CSV parsing errors found",
        details: errors,
        parsedProducts: products.length
      }, { status: 400 });
    }

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No valid products found in CSV" },
        { status: 400 }
      );
    }

    // Upload products to database
    const supabase = getSupabaseAdmin();
    const results = await uploadProducts(supabase, products);

    return NextResponse.json({
      success: true,
      message: `${results.created} products uploaded successfully`,
      stats: {
        total: products.length,
        created: results.created,
        errors: results.errors.length
      },
      errors: results.errors
    });

  } catch (error) {
    console.error("Bulk upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

interface ProductData {
  wine_name: string;
  vintage: string;
  grape_varieties: string;
  color: string;
  base_price_cents: number;
  producer_name: string;
  handle: string;
  description: string;
  description_html: string;
  label_image_path: string;
}

async function parseCSV(csvContent: string): Promise<{
  products: ProductData[];
  errors: string[];
}> {
  const lines = csvContent.trim().split('\n');
  const errors: string[] = [];
  
  if (lines.length < 2) {
    errors.push("CSV must have at least a header row and one data row");
    return { products: [], errors };
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const expectedHeaders = [
    'wine name', 'vintage', 'grape varieties', 'color',
    'base price (sek)', 'producer name', 'handle', 'description',
    'description html', 'image url'
  ];

  // Validate headers
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
    return { products: [], errors };
  }

  const products: ProductData[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: Column count mismatch`);
      continue;
    }

    try {
      const product = {
        wine_name: values[headers.indexOf('wine name')]?.trim() || '',
        vintage: values[headers.indexOf('vintage')]?.trim() || '',
        grape_varieties: values[headers.indexOf('grape varieties')]?.trim() || '',
        color: values[headers.indexOf('color')]?.trim().toLowerCase() || '',
        base_price_cents: Math.round(parseFloat(values[headers.indexOf('base price (sek)')] || '0') * 100),
        producer_name: values[headers.indexOf('producer name')]?.trim() || '',
        handle: values[headers.indexOf('handle')]?.trim() || '',
        description: values[headers.indexOf('description')]?.trim() || '',
        description_html: values[headers.indexOf('description html')]?.trim() || '',
        label_image_path: values[headers.indexOf('image url')]?.trim() || ''
      };

      // Validate required fields
      if (!product.wine_name) errors.push(`Row ${i + 1}: Wine name is required`);
      if (!product.vintage) errors.push(`Row ${i + 1}: Vintage is required`);
      if (!product.grape_varieties) errors.push(`Row ${i + 1}: Grape varieties is required`);
      if (!product.color) errors.push(`Row ${i + 1}: Color is required`);
      if (!['red', 'white', 'rose'].includes(product.color)) {
        errors.push(`Row ${i + 1}: Color must be 'red', 'white', or 'rose'`);
      }
      if (product.base_price_cents <= 0) errors.push(`Row ${i + 1}: Base price must be greater than 0`);
      if (!product.producer_name) errors.push(`Row ${i + 1}: Producer name is required`);
      if (!product.handle) errors.push(`Row ${i + 1}: Handle is required`);
      if (!product.description) errors.push(`Row ${i + 1}: Description is required`);
      if (!product.label_image_path) errors.push(`Row ${i + 1}: Image URL is required`);

      // Generate handle if not provided
      if (!product.handle) {
        product.handle = generateHandle(product.wine_name, product.vintage);
      }

      // Generate HTML description if not provided
      if (!product.description_html) {
        product.description_html = `<p>${product.description}</p>`;
      }

      products.push(product);
    } } catch (error) {
      errors.push(`Row ${i + 1}: Invalid data format`);
    }
  }

  return { products, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result.map(s => s.replace(/^"(.*)"$/, '$1'));
}

function generateHandle(wineName: string, vintage: string): string {
  return wineName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) + '-' + vintage;
}

async function uploadProducts(supabase: any, products: ProductData[]): Promise<{
  created: number;
  errors: string[];
}> {
  let created = 0;
  const errors: string[] = [];

  for (const product of products) {
    try {
      // Check if producer exists, create if not
      let producerId = null;
      const { data: existingProducer } = await supabase
        .from('producers')
        .select('id')
        .eq('name', product.producer_name)
        .single();

      if (existingProducer) {
        producerId = existingProducer.id;
      } else {
        const { data: newProducer, error: producerError } = await supabase
          .from('producers')
          .insert({
            id: randomUUID(),
            name: product.producer_name,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (producerError) {
          errors.push(`Producer "${product.producer_name}": ${producerError.message}`);
          continue;
        }
        producerId = newProducer.id;
      }

      // Check if wine already exists
      const { data: existingWine } = await supabase
        .from('wines')
        .select('id')
        .eq('handle', product.handle)
        .single();

      if (existingWine) {
        errors.push(`Wine with handle "${product.handle}" already exists`);
        continue;
      }

      // Create wine
      const { error: wineError } = await supabase
        .from('wines')
        .insert({
          id: randomUUID(),
          wine_name: product.wine_name,
          vintage: product.vintage,
          grape_varieties: product.grape_varieties,
          color: product.color,
          base_price_cents: product.base_price_cents,
          producer_id: producerId,
          handle: product.handle,
          description: product.description,
          description_html: product.description_html,
          label_image_path: product.label_image_path,
          created_at: new Date().toISOString()
        });

      if (wineError) {
        errors.push(`Wine "${product.wine_name}": ${wineError.message}`);
      } else {
        created++;
      }
    } catch (error) {
      errors.push(`Wine "${product.wine_name}": Unexpected error`);
    }
  }

  return { created, errors };
}
