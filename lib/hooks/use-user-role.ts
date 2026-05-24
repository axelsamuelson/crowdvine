"use client";

import { useEffect, useState } from "react";
import { isStaleRefreshTokenError } from "@/lib/auth/session-errors";
import { createClient } from "@/utils/supabase/client";

export type UserRole = "user" | "producer" | "admin";

interface UserRoleState {
  loading: boolean;
  role: UserRole | null;
  producerId: string | null;
}

export function useUserRole(): UserRoleState {
  const [state, setState] = useState<UserRoleState>({
    loading: true,
    role: null,
    producerId: null,
  });

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const load = async () => {
      try {
        if (mounted) setState((s) => ({ ...s, loading: true }));
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError && isStaleRefreshTokenError(authError)) {
          await supabase.auth.signOut({ scope: "local" });
        }

        if (!user) {
          if (mounted)
            setState({ loading: false, role: null, producerId: null });
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, producer_id")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          if (mounted)
            setState({ loading: false, role: null, producerId: null });
          return;
        }

        const role = (profile?.role || "user") as UserRole;
        if (mounted) {
          setState({
            loading: false,
            role,
            producerId: profile?.producer_id || null,
          });
        }
      } catch {
        if (mounted)
          setState({ loading: false, role: null, producerId: null });
      }
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}


