"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { isDirtywineHost } from "@/lib/b2b-site";

/**
 * Host-derived B2B / Dirty Wine hint.
 * Root layout stays request-free for ISR (`isB2B={false}`); this provider
 * hydrates from `window.location` so Dirty Wine chrome/prices work without
 * `headers()` in the shared shell.
 */
const B2BModeServerHintContext = createContext<boolean>(false);

export function B2BModeProvider({
  isB2B,
  children,
}: {
  isB2B: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [resolved, setResolved] = useState(isB2B);

  useEffect(() => {
    setResolved(isB2B);
  }, [isB2B]);

  useEffect(() => {
    // When the layout cannot pass a host hint (ISR shell), detect client-side.
    if (isB2B) return;
    setResolved(
      isDirtywineHost(
        window.location.hostname,
        new URLSearchParams(window.location.search),
      ),
    );
  }, [pathname, isB2B]);

  return (
    <B2BModeServerHintContext.Provider value={resolved}>
      {children}
    </B2BModeServerHintContext.Provider>
  );
}

export function useB2BModeServerHint(): boolean {
  return useContext(B2BModeServerHintContext);
}
