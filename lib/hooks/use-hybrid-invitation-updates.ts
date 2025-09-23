"use client";

import { useEffect, useState } from 'react';
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

interface UseHybridInvitationUpdatesProps {
  invitation: Invitation | null;
  onInvitationUpdate: (updatedInvitation: Invitation) => void;
}

export function useHybridInvitationUpdates({ invitation, onInvitationUpdate }: UseHybridInvitationUpdatesProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const checkInvitationStatus = async () => {
    if (!invitation?.code) return;
    
    try {
      const response = await fetch('/api/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: invitation.code })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.invitation) {
          const updatedInvitation = {
            ...invitation,
            currentUses: data.invitation.currentUses,
            maxUses: data.invitation.maxUses,
            usedBy: data.invitation.usedBy,
            usedAt: data.invitation.usedAt,
            isActive: data.invitation.isActive
          };

          // Check if invitation was just used
          const wasJustUsed = invitation.currentUses === 0 && data.invitation.currentUses > 0;
          
          if (wasJustUsed) {
            toast.success("🎉 Your invitation was used! You've earned a 5% reward! Earn 10% when they make a reservation.");
          }

          onInvitationUpdate(updatedInvitation);
          setLastUpdate(new Date());
        }
      }
    } catch (error) {
      console.error('Error checking invitation status:', error);
    }
  };

  useEffect(() => {
    if (!invitation?.code) return;

    console.log('Setting up hybrid invitation updates for:', invitation.code);

    // Start with immediate check
    checkInvitationStatus();

    // Set up polling every 10 seconds
    const interval = setInterval(() => {
      checkInvitationStatus();
    }, 10000);

    setPollingInterval(interval);
    setIsConnected(true);

    // Set up visibility change listener for immediate updates when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Tab became visible, checking invitation status');
        checkInvitationStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setIsConnected(false);
    };
  }, [invitation?.code]);

  return {
    isConnected,
    lastUpdate,
    checkStatus: checkInvitationStatus
  };
}
