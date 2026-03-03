"use client";

import { useEffect } from "react";

/**
 * Ensures the summary page can scroll (some layouts set overflow hidden on body).
 */
export function EnsureScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflowY;
    const prevBody = body.style.overflowY;
    html.style.overflowY = "auto";
    body.style.overflowY = "auto";
    return () => {
      html.style.overflowY = prevHtml;
      body.style.overflowY = prevBody;
    };
  }, []);
  return null;
}
