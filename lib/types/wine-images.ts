export interface WineImage {
  id: string;
  wine_id: string;
  image_path: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWineImageData {
  wine_id: string;
  image_path: string;
  alt_text?: string;
  sort_order?: number;
  is_primary?: boolean;
}
