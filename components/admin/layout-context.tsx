"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type AdminBadge = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

type AdminAction = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
};

export type AdminHeaderConfig = {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  badges?: AdminBadge[];
  actions?: AdminAction[];
};

const DEFAULT_CONFIG: AdminHeaderConfig = {
  title: "Admin",
  description: "CrowdVine control center",
  breadcrumbs: [],
  badges: [],
  actions: [],
};

type AdminLayoutContextValue = {
  header: AdminHeaderConfig;
  setHeader: (config: Partial<AdminHeaderConfig>) => void;
  resetHeader: () => void;
  navBadges: Record<string, number>;
  setNavBadge: (key: string, count: number | null) => void;
};

const AdminLayoutContext = createContext<AdminLayoutContextValue | undefined>(
  undefined,
);

export function AdminLayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [header, setHeaderState] =
    useState<AdminHeaderConfig>(DEFAULT_CONFIG);
  const [navBadges, setNavBadges] = useState<Record<string, number>>({});

  const setHeader = useCallback((config: Partial<AdminHeaderConfig>) => {
    setHeaderState((prev) => ({
      ...prev,
      ...config,
    }));
  }, []);

  const resetHeader = useCallback(() => {
    setHeaderState(DEFAULT_CONFIG);
  }, []);

  const setNavBadge = useCallback((key: string, count: number | null) => {
    setNavBadges((prev) => {
      if (count === null || count === undefined) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: count,
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      header,
      setHeader,
      resetHeader,
      navBadges,
      setNavBadge,
    }),
    [header, setHeader, resetHeader, navBadges, setNavBadge],
  );

  return (
    <AdminLayoutContext.Provider value={value}>
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  const ctx = useContext(AdminLayoutContext);
  if (!ctx) {
    throw new Error("useAdminLayout must be used within AdminLayoutProvider");
  }
  return ctx;
}

