"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  code: string;
  signupUrl: string;
  codeSignupUrl?: string;
  expiresAt: string;
  maxUses: number;
  currentUses?: number;
  usedBy?: string;
  usedAt?: string;
  isActive?: boolean;
}

interface UseRealtimeInvitationProps {
  invitation: Invitation | null;
  onInvitationUpdate: (updatedInvitation: Invitation) => void;
}

export function useRealtimeInvitation({ invitation, onInvitationUpdate }: UseRealtimeInvitationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!invitation?.id) return;

    const supabase = createClient();
    
    console.log('Setting up realtime subscription for invitation:', invitation.id);

    // Subscribe to changes on the invitation_codes table
    const channel = supabase
      .channel(`invitation-${invitation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invitation_codes',
          filter: `id=eq.${invitation.id}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          const updatedData = payload.new as any;
          const updatedInvitation: Invitation = {
            id: updatedData.id,
            code: updatedData.code,
            signupUrl: invitation.signupUrl, // Keep existing URL
            codeSignupUrl: invitation.codeSignupUrl, // Keep existing URL
            expiresAt: updatedData.expires_at,
            maxUses: updatedData.max_uses,
            currentUses: updatedData.current_uses,
            usedBy: updatedData.used_by,
            usedAt: updatedData.used_at,
            isActive: updatedData.is_active
          };

          // Check if invitation was just used
          const wasJustUsed = invitation.currentUses === 0 && updatedData.current_uses > 0;
          
          if (wasJustUsed) {
            toast.success("🎉 Your invitation was used! You've earned a 5% reward! Earn 10% when they make a reservation.");
          }

          onInvitationUpdate(updatedInvitation);
          setLastUpdate(new Date());
        }
      )
      .on('system', {}, (status) => {
        console.log('Realtime system status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log('Successfully subscribed to realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          console.error('Realtime channel error');
        }
      })
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [invitation?.id, invitation?.currentUses, onInvitationUpdate]);

  return {
    isConnected,
    lastUpdate
  };
}
