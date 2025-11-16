"use client";

import { useEffect, useMemo } from "react";

import {
  AdminHeaderConfig,
  useAdminLayout,
} from "@/components/admin/layout-context";

type AdminPageShellProps = {
  header?: Partial<AdminHeaderConfig>;
  children: React.ReactNode;
};

export function AdminPageShell({ header, children }: AdminPageShellProps) {
  const { setHeader, resetHeader } = useAdminLayout();

  const memoizedHeader = useMemo(() => header, [header]);

  useEffect(() => {
    if (memoizedHeader) {
      setHeader(memoizedHeader);
    }
    return () => {
      resetHeader();
    };
  }, [memoizedHeader, resetHeader, setHeader]);

  return <div className="space-y-10">{children}</div>;
}

