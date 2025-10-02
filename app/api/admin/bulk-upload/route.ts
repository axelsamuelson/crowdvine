import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

// Simple fuzzy string matching function
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

async function findSimilarProducers(supabase: any, producerName: string): Promise<Array<{
  name: string;
  similarity: number;
}>> {
  // Get all existing producers
  const { data: producers } = await supabase
    .from('producers')
    .select('name');
  
  if (!producers || producers.length === 0) return [];
  
  // Calculate similarity for each producer
  const similarities = producers.map(producer => ({
    name: producer.name,
    similarity: calculateSimilarity(producerName, producer.name)
  }));
  
  // Filter for reasonably similar names (>70% similarity)
  const similar = similarities
    .filter(item => item.similarity > 0.7)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3); // Top 3 matches
  
  return similar;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type");
    
    let products: ProductData[];
    let errors: string[] = [];

    if (contentType?.includes("application/json")) {
      // Handle JSON data from review step
      const body = await request.json();
      if (!body.products || !Array.isArray(body.products)) {
        return NextResponse.json(
          { error: "Invalid JSON data. Expected array of products" },
          { status: 400 }
        );
      }
      products = body.products;
    } else {
      // Handle CSV file upload (legacy endpoint)
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
      const parsed = await parseCSV(csvContent);
      products = parsed.products;
      errors = parsed.errors;
      
      if (errors.length > 0) {
        return NextResponse.json({
          error: "CSV parsing errors found",
          details: errors,
          parsedProducts: products.length
        }, { status: 400 });
      }
    }

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No valid products found" },
        { status: 400 }
      );
    }

    // Upload products to database
    const supabase = getSupabaseAdmin();
    const results = await uploadProducts(supabase, products);

    return NextResponse.json({
      success: true,
      message: `${results.created} products uploaded successfully${results.warnings.length > 0 ? ` with ${results.warnings.length} warnings` : ''}`,
      stats: {
        total: products.length,
        created: results.created,
        errors: results.errors.length,
        warnings: results.warnings.length
      },
      errors: results.errors,
      warnings: results.warnings
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
  cost_amount: number;
  cost_currency: string;
  margin_percentage: number;
  producer_name: string;
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
    'cost', 'currency', 'margin (%)', 'producer name', 'description',
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
        cost_amount: parseFloat(values[headers.indexOf('cost')] || '0') || 0,
        cost_currency: values[headers.indexOf('currency')]?.trim().toUpperCase() || 'EUR',
        margin_percentage: parseFloat(values[headers.indexOf('margin (%)')] || '10') || 10,
        producer_name: values[headers.indexOf('producer name')]?.trim() || '',
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
      if (product.cost_amount <= 0) errors.push(`Row ${i + 1}: Cost must be greater than 0`);
      if (!product.producer_name) errors.push(`Row ${i + 1}: Producer name is required`);
      if (product.margin_percentage <= 0 || product.margin_percentage >= 100) errors.push(`Row ${i + 1}: Margin must be between 1 and 99`);
      if (!product.description) errors.push(`Row ${i + 1}: Description is required`);
      if (!product.label_image_path) errors.push(`Row ${i + 1}: Image URL is required`);

      // Generate HTML description if not provided
      if (!product.description_html) {
        product.description_html = `<p>${product.description}</p>`;
      }

      products.push(product);
    } catch (error) {
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
  warnings: Array<{
    row: number;
    wine: string;
    type: string;
    message: string;
    suggestions?: string[];
  }>;
}> {
  let created = 0;
  const errors: string[] = [];
  const warnings: Array<{
    row: number;
    wine: string;
    type: string;
    message: string;
    suggestions?: string[];
  }> = [];

  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    const rowNumber = index + 2; // +2 because index starts at 0 and CSV starts at row 2
    
    try {
      // Check if producer exists exactly
      let producerId = null;
      const { data: existingProducer } = await supabase
        .from('producers')
        .select('id')
        .eq('name', product.producer_name)
        .single();

      if (existingProducer) {
        producerId = existingProducer.id;
      } else {
        // Check for similar producers before creating new one
       const similarProducers = await findSimilarProducers(supabase, product.producer_name);
        
        if (similarProducers.length > 0) {
          const suggestions = similarProducers.map(p => `${p.name} (${Math.round(p.similarity * 100)}% match)`);
          
          warnings.push({
            row: rowNumber,
            wine: product.wine_name,
            type: 'producer_suggestion',
            message: `Producer "${product.producer_name}" not found. Did you mean one of these?`,
            suggestions: suggestions
          });
          
          // Still create the producer but warn the user
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
        } else {
          // No similar producers found, create new one silently
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
      }

      // Generate handle automatically
      const generatedHandle = generateHandle(product.wine_name, product.vintage);

      // Check if wine already exists
      const { data: existingWine } = await supabase
        .from('wines')
        .select('id')
        .eq('handle', generatedHandle)
        .single();

      if (existingWine) {
        errors.push(`Wine with handle "${generatedHandle}" already exists`);
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
          base_price_cents: 0, // Will be calculated by gross margin formula
          producer_id: producerId,
          handle: generatedHandle,
          description: product.description,
          description_html: product.description_html,
          label_image_path: product.label_image_path,
          // New pricing fields
          cost_currency: product.cost_currency,
          cost_amount: product.cost_amount,
          alcohol_tax_cents: 2219, // Fixed 22.19 SEK = 2219 cents
          price_includes_vat: true,
          margin_percentage: product.margin_percentage,
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

  return { created, errors, warnings };
}
