"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export type UserRole = "user" | "producer" | "admin" | "business";

interface UserRoleState {
  loading: boolean;
  role: UserRole | null;
  roles: UserRole[];
  producerId: string | null;
}

export function useUserRole(): UserRoleState {
  const [state, setState] = useState<UserRoleState>({
    loading: true,
    role: null,
    roles: [],
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
          setState({ loading: false, role: null, roles: [], producerId: null });
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, roles, producer_id")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          setState({ loading: false, role: null, roles: [], producerId: null });
          return;
        }

        // Use roles array if available, otherwise fallback to single role
        const roles: UserRole[] = profile?.roles && Array.isArray(profile.roles)
          ? (profile.roles as UserRole[])
          : profile?.role
            ? [profile.role as UserRole]
            : ["user"];

        // Get primary role (highest in hierarchy) for backward compatibility
        const roleHierarchy: Record<UserRole, number> = {
          user: 0,
          business: 1,
          producer: 2,
          admin: 3,
        };
        const primaryRole = roles.reduce((highest, r) => {
          return roleHierarchy[r] > roleHierarchy[highest] ? r : highest;
        }, "user" as UserRole);

        setState({
          loading: false,
          role: primaryRole,
          roles,
          producerId: profile?.producer_id || null,
        });
      } catch {
        setState({ loading: false, role: null, roles: [], producerId: null });
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


