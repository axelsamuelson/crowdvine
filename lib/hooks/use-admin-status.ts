"use client";

import { useEffect, useState } from "react";
import { ensureInternalDeviceFromAdmin } from "@/lib/analytics/internal-device";

interface AdminStatus {
  loading: boolean;
  isAdmin: boolean;
}

/**
 * Hook to check if current user is admin
 * Checks both profile role and admin cookies
 */
export function useAdminStatus(): AdminStatus {
  const [state, setState] = useState<AdminStatus>({
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/me/admin");
        if (!response.ok) {
          setState({ loading: false, isAdmin: false });
          return;
        }
        const data = await response.json();
        const isAdmin = data.isAdmin === true;
        if (isAdmin) {
          ensureInternalDeviceFromAdmin();
        }
        setState({
          loading: false,
          isAdmin,
        });
      } catch (error) {
        console.error("Error checking admin status:", error);
        setState({
          loading: false,
          isAdmin: false,
        });
      }
    };

    checkAdmin();
  }, []);

  return state;
}
