"use client";

import { useEffect, useState } from "react";

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
        const data = await response.json();
        setState({
          loading: false,
          isAdmin: data.isAdmin === true,
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
