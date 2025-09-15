# Wine Multiple Images Feature

## Overview
This feature enables wine products to have multiple images with drag-and-drop reordering and individual image management in the admin panel.

## Database Changes

### New Table: `wine_images`
```sql
CREATE TABLE wine_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes
- `idx_wine_images_wine_id` - For wine lookups
- `idx_wine_images_sort_order` - For ordered image retrieval
- `idx_wine_images_primary` - For primary image queries
- `idx_wine_images_unique_primary` - Ensures only one primary image per wine

## New Components

### `WineImageUpload`
- **Location**: `components/admin/wine-image-upload.tsx`
- **Features**:
  - Multiple image upload with drag-and-drop
  - Visual reordering with arrow buttons
  - Individual image deletion
  - Primary image selection (star icon)
  - Preview functionality
  - Position indicators

### `wine-images.ts` Actions
- **Location**: `lib/actions/wine-images.ts`
- **Functions**:
  - `getWineImages(wineId)` - Get all images for a wine
  - `createWineImage(data)` - Add new image
  - `updateWineImage(id, data)` - Update image properties
  - `deleteWineImage(id)` - Remove image
  - `reorderWineImages(wineId, imageIds)` - Reorder images
  - `setPrimaryWineImage(imageId)` - Set primary image

## Updated Components

### `WineForm`
- **Location**: `components/admin/wine-form.tsx`
- **Changes**:
  - Replaced `ImageUpload` with `WineImageUpload`
  - Added state management for existing images
  - Updated form submission to handle multiple images
  - Loads existing images when editing

### API Routes
- **Updated**: `app/api/crowdvine/products/route.ts`
- **Updated**: `app/api/crowdvine/products/[handle]/route.ts`
- **Changes**:
  - Fetch images from `wine_images` table
  - Return multiple images in product data
  - Maintain backward compatibility with `label_image_path`

## Usage

### Admin Panel
1. Navigate to wine edit/create page
2. Use the "Product Images" section
3. Drag and drop images or click "Choose Files"
4. Reorder images using arrow buttons
5. Set primary image using star icon
6. Delete individual images using X button
7. First image automatically becomes primary if no existing images

### Product Display
- First image (primary) is used as featured image
- All images are available in product galleries
- Images maintain sort order from admin panel

## Migration
Run the migration script to create the table and migrate existing data:
```bash
npx tsx scripts/run-wine-images-migration.ts
```

Or manually execute the SQL in Supabase dashboard.

## Backward Compatibility
- Existing `label_image_path` field is preserved
- API routes fall back to `label_image_path` if no images in `wine_images` table
- Migration automatically creates `wine_images` entries from existing `label_image_path` data
