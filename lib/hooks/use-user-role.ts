"use client";

import { useEffect, useState } from "react";
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
    const supabase = createClient();

    const load = async () => {
      try {
        setState((s) => ({ ...s, loading: true }));
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setState({ loading: false, role: null, producerId: null });
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, producer_id")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          setState({ loading: false, role: null, producerId: null });
          return;
        }

        const role = (profile?.role || "user") as UserRole;
        setState({
          loading: false,
          role,
          producerId: profile?.producer_id || null,
        });
      } catch {
        setState({ loading: false, role: null, producerId: null });
      }
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}


