"use server";

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    size: number;
    type: string;
    dimensions?: { width: number; height: number };
  };
}

/**
 * Validates an uploaded image file
 */
export async function validateImage(file: File): Promise<ImageValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const minDimensions = { width: 200, height: 200 };
  const maxDimensions = { width: 4000, height: 4000 };

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
  }

  // Check minimum size
  if (file.size < 1024) { // 1KB minimum
    errors.push('File too small. Minimum size: 1KB');
  }

  let dimensions: { width: number; height: number } | undefined;

  try {
    // Get image dimensions
    const imageData = await getImageDimensions(file);
    dimensions = imageData;

    // Check dimensions
    if (dimensions.width < minDimensions.width || dimensions.height < minDimensions.height) {
      errors.push(`Image too small. Minimum dimensions: ${minDimensions.width}x${minDimensions.height}px`);
    }

    if (dimensions.width > maxDimensions.width || dimensions.height > maxDimensions.height) {
      warnings.push(`Image very large. Consider resizing to max ${maxDimensions.width}x${maxDimensions.height}px for better performance`);
    }

    // Check aspect ratio
    const aspectRatio = dimensions.width / dimensions.height;
    if (aspectRatio < 0.5 || aspectRatio > 2) {
      warnings.push('Unusual aspect ratio. Consider using images closer to 1:1 ratio');
    }

  } catch (error) {
    errors.push('Could not read image dimensions. File may be corrupted.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fileInfo: {
      size: file.size,
      type: file.type,
      dimensions
    }
  };
}

/**
 * Gets image dimensions from a file
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    
    img.src = url;
  });
}

/**
 * Validates image path exists and is accessible
 */
export async function validateImagePath(imagePath: string): Promise<{
  exists: boolean;
  accessible: boolean;
  error?: string;
}> {
  try {
    // Clean the path
    const cleanPath = imagePath.trim().replace(/\n/g, '');
    
    if (!cleanPath) {
      return { exists: false, accessible: false, error: 'Empty image path' };
    }

    // If it's a full URL, test it directly
    if (cleanPath.startsWith('http')) {
      try {
        const response = await fetch(cleanPath, { method: 'HEAD' });
        return {
          exists: response.ok,
          accessible: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        };
      } catch (error) {
        return {
          exists: false,
          accessible: false,
          error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }

    // For relative paths, test via our image proxy
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pactwines.com';
    const testUrl = cleanPath.startsWith('/uploads/') 
      ? `${baseUrl}/api/images/${cleanPath.replace('/uploads/', '')}`
      : `${baseUrl}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;

    try {
      const response = await fetch(testUrl, { method: 'HEAD' });
      return {
        exists: response.ok,
        accessible: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      return {
        exists: false,
        accessible: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }

  } catch (error) {
    return {
      exists: false,
      accessible: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Checks if an image is a valid wine product image
 */
export function isValidWineImage(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB for wine images
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
}

/**
 * Generates a standardized filename for wine images
 */
export function generateWineImageFilename(wineName: string, vintage: string, index?: number): string {
  const sanitizedName = wineName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  const sanitizedVintage = vintage.replace(/[^0-9]/g, '');
  const suffix = index !== undefined ? `-${index}` : '';
  
  return `${sanitizedName}-${sanitizedVintage}${suffix}.jpg`;
}
