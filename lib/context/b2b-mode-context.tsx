"use client";

import { createContext, useContext } from "react";

/**
 * SSR hint: dirtywine.se / localhost ?b2b=1 vs pactwines.com / localhost default.
 * Set from root layout via request Host header.
 */
const B2BModeServerHintContext = createContext<boolean>(false);

export function B2BModeProvider({
  isB2B,
  children,
}: {
  isB2B: boolean;
  children: React.ReactNode;
}) {
  return (
    <B2BModeServerHintContext.Provider value={isB2B}>
      {children}
    </B2BModeServerHintContext.Provider>
  );
}

export function useB2BModeServerHint(): boolean {
  return useContext(B2BModeServerHintContext);
}
