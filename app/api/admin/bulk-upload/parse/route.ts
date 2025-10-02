import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Import the same parsing functions from bulk-upload route
// Copy the helper functions here (we can refactor later)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

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

interface ReviewProduct extends ProductData {
  rowNumber: number;
  status: 'valid' | 'warning' | 'error';
  issues: string[];
  similarProducers?: Array<{
    name: string;
    similarity: number;
  }>;
}

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

    // Parse CSV content
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

    // Review products for issues and suggestions
    const supabase = getSupabaseAdmin();
    const reviewProducts = await reviewProductsWithSuggestions(supabase, products);

    return NextResponse.json({
      success: true,
      message: `CSV parsed successfully. Review ${reviewProducts.length} products`,
      products: reviewProducts,
      summary: {
        total: reviewProducts.length,
        valid: reviewProducts.filter(p => p.status === 'valid').length,
        warnings: reviewProducts.filter(p => p.status === 'warning').length,
        errors: reviewProducts.filter(p => p.status === 'error').length
      }
    });

  } catch (error) {
    console.error("CSV parse error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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

  // Check for missing headers but continue parsing - show as issues in review
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  
  // Add severity levels to errors
  const missingHeadersStr = missingHeaders.join(', ');
  if (missingHeadersStr) {
    const severityLevel = missingHeaders.includes('wine name') || missingHeaders.includes('vintage') ? 'critical' : 'warning';
    errors.push(`${severityLevel}: Missing headers: ${missingHeadersStr}`);
    if (missingHeadersStr.includes('wine name') || missingHeadersStr.includes('vintage')) {
      errors.push(`Critical: Cannot parse without required fields: Wine Name and Vintage`);
      return { products: [], errors };
    }
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
        handle: generateHandle(values[headers.indexOf('wine name')] || '', values[headers.indexOf('vintage')] || ''),
        description: values[headers.indexOf('description')]?.trim() || '',
        description_html: values[headers.indexOf('description html')]?.trim() || '',
        label_image_path: values[headers.indexOf('image url')]?.trim() || 'https://images.unsplash.com/photo-1553361371-9b22f78e8b5d?w=600&h=600&fit=crop&q=80'
      };

      // Collect issues instead of returning errors immediately
      const rowIssues: string[] = [];
      
      // Critical fields - cannot proceed without these
      if (!product.wine_name) rowIssues.push(`Critical: Wine name is required`);
      if (!product.vintage) rowIssues.push(`Critical: Vintage is required`);
      
      // Required fields with defaults
      if (!product.grape_varieties) {
        product.grape_varieties = "Mixed varieties"; // Default value
        rowIssues.push(`Warning: Grape varieties missing - using default`);
      }
      if (!product.description) {
        product.description = "Premium wine from this producer"; // Default value
        rowIssues.push(`Warning: Description missing - using default`);
      }
      
      // Required fields that must be fixed
      if (!product.color) rowIssues.push(`Error: Color is required`);
      else if (!['red', 'white', 'rose'].includes(product.color)) {
        rowIssues.push(`Error: Color must be 'red', 'white', or 'rose'`);
      }
      
      if (product.cost_amount <= 0) rowIssues.push(`Error: Cost must be greater than 0`);
      if (!product.producer_name) rowIssues.push(`Error: Producer name is required`);
      if (product.margin_percentage <= 0 || product.margin_percentage >= 100) {
        rowIssues.push(`Error: Margin must be between 1 and 99`);
      }
      
      // Generate HTML description if not provided
      if (!product.description_html) {
        product.description_html = `<p>${product.description}</p>`;
      }

      // Add to products list - collect all issues for review
      (product as any).rowIssues = rowIssues.length > 0 ? rowIssues.map(issue => `Row ${i + 1}: ${issue}`) : [];
      (product as any).canUpload = !rowIssues.some(issue => issue.startsWith('Critical:') || issue.startsWith('Error:'));
      
      products.push(product);
    } catch (error) {
      errors.push(`Row ${i + 1}: Invalid data format`);
    }
  }

  return { products, errors };
}

async function reviewProductsWithSuggestions(supabase: any, products: ProductData[]): Promise<ReviewProduct[]> {
  const reviewProducts: ReviewProduct[] = [];

  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    const rowNumber = index + 2;
    
    const reviewProduct: ReviewProduct = {
      ...product,
      rowNumber,
      status: 'valid',
      issues: [],
      similarProducers: []
    };

    // Check for duplicate wine handles
    const { data: existingWine } = await supabase
      .from('wines')
      .select('id')
      .eq('handle', product.handle)
      .single();

    if (existingWine) {
      reviewProduct.status = 'error';
      reviewProduct.issues.push(`Wine with handle "${product.handle}" already exists`);
    }

    // Check for producer matches and fuzzy suggestions
    const { data: existingProducer } = await supabase
      .from('producers')
      .select('id')
      .eq('name', product.producer_name)
      .single();

    if (!existingProducer) {
      // Get fuzzy matches for producers
      const { data: producers } = await supabase
        .from('producers')
        .select('name');
      
      if (producers && producers.length > 0) {
        const similarities = producers.map(producer => ({
          name: producer.name,
          similarity: calculateSimilarity(product.producer_name, producer.name)
        }));
        
        const similar = similarities
          .filter(item => item.similarity > 0.7)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3);
        
        if (similar.length > 0) {
          reviewProduct.status = reviewProduct.status === 'error' ? 'error' : 'warning';
          reviewProduct.issues.push(`Producer "${product.producer_name}" not found`);
          reviewProduct.similarProducers = similar;
        }
      } else {
        reviewProduct.status = reviewProduct.status === 'error' ? 'error' : 'warning';
        reviewProduct.issues.push(`Producer "${product.producer_name}" will be created`);
      }
    }

    reviewProducts.push(reviewProduct);
  }

  return reviewProducts;
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
