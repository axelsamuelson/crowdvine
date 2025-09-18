#!/usr/bin/env node

/**
 * Cleanup script for expired tokens and invitation codes
 * This script can be run manually or scheduled as a cron job
 * 
 * Usage:
 *   node scripts/cleanup-expired-tokens.js
 * 
 * Or schedule as cron job (runs daily at 2 AM):
 *   0 2 * * * /path/to/node /path/to/scripts/cleanup-expired-tokens.js
 */

import { getSupabaseAdmin } from '../lib/supabase-admin.js';

async function cleanupExpiredTokens() {
  console.log('🧹 Starting cleanup of expired tokens and invitation codes...');
  
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Clean up expired access tokens
    console.log('Cleaning up expired access tokens...');
    const { data: expiredTokens, error: tokensError } = await supabase
      .from('access_tokens')
      .delete()
      .lt('expires_at', now)
      .eq('used', false)
      .select();

    if (tokensError) {
      console.error('❌ Error cleaning up expired access tokens:', tokensError);
    } else {
      console.log(`✅ Cleaned up ${expiredTokens?.length || 0} expired access tokens`);
    }

    // Clean up expired invitation codes (mark as inactive)
    console.log('Cleaning up expired invitation codes...');
    const { data: expiredInvitations, error: invitationsError } = await supabase
      .from('invitation_codes')
      .update({ is_active: false })
      .lt('expires_at', now)
      .eq('is_active', true)
      .select();

    if (invitationsError) {
      console.error('❌ Error cleaning up expired invitation codes:', invitationsError);
    } else {
      console.log(`✅ Cleaned up ${expiredInvitations?.length || 0} expired invitation codes`);
    }

    console.log('🎉 Cleanup completed successfully!');
    
    return {
      success: true,
      tokensCleaned: expiredTokens?.length || 0,
      invitationsCleaned: expiredInvitations?.length || 0,
      timestamp: now
    };

  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// Run cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupExpiredTokens()
    .then((result) => {
      if (result.success) {
        console.log('Cleanup completed:', result);
        process.exit(0);
      } else {
        console.error('Cleanup failed:', result);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { cleanupExpiredTokens };
