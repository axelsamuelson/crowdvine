"use server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createHash } from "crypto";

export interface ImageBackupInfo {
  fileName: string;
  originalPath: string;
  backupPath: string;
  checksum: string;
  uploadedAt: string;
}

/**
 * Creates a backup of an uploaded image
 */
export async function backupImage(
  file: File,
  originalPath: string
): Promise<ImageBackupInfo> {
  const supabase = getSupabaseAdmin();
  
  // Generate unique backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileExtension = file.name.split('.').pop();
  const backupFileName = `backup-${timestamp}-${file.name}`;
  
  // Create checksum for integrity verification
  const fileBuffer = await file.arrayBuffer();
  const checksum = createHash('sha256').update(Buffer.from(fileBuffer)).digest('hex');
  
  try {
    // Upload to backup folder in Supabase Storage
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(`backups/${backupFileName}`, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      throw new Error(`Backup upload failed: ${error.message}`);
    }

    // Store backup metadata in database
    const backupInfo: ImageBackupInfo = {
      fileName: backupFileName,
      originalPath,
      backupPath: `backups/${backupFileName}`,
      checksum,
      uploadedAt: new Date().toISOString()
    };

    // Save backup info to database (we'll create this table)
    const { error: dbError } = await supabase
      .from('image_backups')
      .insert(backupInfo);

    if (dbError) {
      console.warn('Failed to save backup metadata:', dbError);
      // Don't fail the backup process if metadata save fails
    }

    console.log(`✅ Image backed up: ${backupFileName}`);
    return backupInfo;
    
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

/**
 * Restores an image from backup
 */
export async function restoreFromBackup(backupInfo: ImageBackupInfo): Promise<string> {
  const supabase = getSupabaseAdmin();
  
  try {
    // Download from backup location
    const { data, error } = await supabase.storage
      .from('uploads')
      .download(backupInfo.backupPath);

    if (error) {
      throw new Error(`Backup download failed: ${error.message}`);
    }

    // Verify checksum
    const fileBuffer = await data.arrayBuffer();
    const currentChecksum = createHash('sha256').update(Buffer.from(fileBuffer)).digest('hex');
    
    if (currentChecksum !== backupInfo.checksum) {
      throw new Error('Backup file integrity check failed');
    }

    // Upload to original location
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(backupInfo.originalPath, fileBuffer, {
        contentType: 'image/jpeg', // Default, could be improved
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Restore upload failed: ${uploadError.message}`);
    }

    console.log(`✅ Image restored from backup: ${backupInfo.originalPath}`);
    return uploadData.path;
    
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  }
}

/**
 * Lists all available backups
 */
export async function listBackups(): Promise<ImageBackupInfo[]> {
  const supabase = getSupabaseAdmin();
  
  try {
    const { data, error } = await supabase
      .from('image_backups')
      .select('*')
      .order('uploadedAt', { ascending: false });

    if (error) {
      console.warn('Failed to list backups:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('List backups failed:', error);
    return [];
  }
}

/**
 * Cleans up old backups (keeps last 30 days)
 */
export async function cleanupOldBackups(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // Get old backups
    const { data: oldBackups, error: selectError } = await supabase
      .from('image_backups')
      .select('*')
      .lt('uploadedAt', thirtyDaysAgo.toISOString());

    if (selectError) {
      throw new Error(`Failed to select old backups: ${selectError.message}`);
    }

    if (!oldBackups || oldBackups.length === 0) {
      console.log('No old backups to clean up');
      return;
    }

    // Delete files from storage
    const filesToDelete = oldBackups.map(backup => backup.backupPath);
    const { error: deleteError } = await supabase.storage
      .from('uploads')
      .remove(filesToDelete);

    if (deleteError) {
      console.warn('Failed to delete some backup files:', deleteError);
    }

    // Delete metadata from database
    const { error: dbDeleteError } = await supabase
      .from('image_backups')
      .delete()
      .lt('uploadedAt', thirtyDaysAgo.toISOString());

    if (dbDeleteError) {
      console.warn('Failed to delete backup metadata:', dbDeleteError);
    }

    console.log(`✅ Cleaned up ${oldBackups.length} old backups`);
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}
