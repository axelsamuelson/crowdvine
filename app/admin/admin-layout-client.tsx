"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/admin/sidebar";
import { AdminTopNav } from "@/components/admin/admin-top-nav";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  userEmail: string;
  onSignOut: () => void;
}

function debugScrollLog(payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  fetch("/api/debug/scroll-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export function AdminLayoutClient({
  children,
  userEmail,
  onSignOut,
}: AdminLayoutClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const logCountRef = useRef(0);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    // #region scroll debug log
    debugScrollLog({
      hypothesisId: "H3",
      location: "admin-layout-client:init",
      message: "Admin main metrics",
      data: {
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        overflowY: window.getComputedStyle(el).overflowY,
        overflowX: window.getComputedStyle(el).overflowX,
      },
      timestamp: Date.now(),
    });
    // #endregion

    const emit = (hypothesisId: string, message: string) => {
      if (logCountRef.current >= 8) return;
      logCountRef.current += 1;
      // #region scroll debug log
      debugScrollLog({
        hypothesisId,
        location: "admin-layout-client:main",
        message,
        data: {
          scrollTop: el.scrollTop,
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
        },
        timestamp: Date.now(),
      });
      // #endregion
    };

    const onScroll = () => emit("H3", "Main scrolled");
    const onTouchMove = () => emit("H4", "Main touchmove observed");

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.classList.add("admin-app-root");
    document.body.classList.add("admin-app-root");
    return () => {
      document.documentElement.classList.remove("admin-app-root");
      document.body.classList.remove("admin-app-root");
    };
  }, []);

  useLayoutEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const el = mainRef.current;
    if (!el) return;

    const log = (hypothesisId: string, message: string, data: object) => {
      // #region agent log
      fetch("/api/debug/agent-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "aae6fd",
          hypothesisId,
          location: "admin-layout-client.tsx:scrollProbe",
          message,
          data,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    };

    const cs = window.getComputedStyle(el);
    log("H4", "main scrollability snapshot", {
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      scrollTop: el.scrollTop,
      overflowY: cs.overflowY,
      overflowX: cs.overflowX,
      canScrollY: el.scrollHeight > el.clientHeight + 1,
    });

    let touchMoves = 0;
    const onDocTouchMove = (e: TouchEvent) => {
      if (touchMoves >= 14) return;
      touchMoves += 1;
      const t = e.target;
      log("H5", "document capture touchmove", {
        n: touchMoves,
        targetTag: t instanceof Element ? t.tagName : "?",
        targetClass:
          t instanceof Element ? (t as HTMLElement).className?.slice?.(0, 80) : "",
        mainScrollTop: el.scrollTop,
        mainScrollHeight: el.scrollHeight,
        mainClientHeight: el.clientHeight,
        defaultPrevented: e.defaultPrevented,
      });
    };

    let scrollEvents = 0;
    const onMainScroll = () => {
      if (scrollEvents >= 8) return;
      scrollEvents += 1;
      log("H5", "main scroll fired", {
        n: scrollEvents,
        scrollTop: el.scrollTop,
      });
    };

    document.addEventListener("touchmove", onDocTouchMove, {
      capture: true,
      passive: true,
    });
    el.addEventListener("scroll", onMainScroll, { passive: true });

    return () => {
      document.removeEventListener("touchmove", onDocTouchMove, {
        capture: true,
      });
      el.removeEventListener("scroll", onMainScroll);
    };
  }, []);

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 w-full bg-white pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] dark:bg-[#0F0F12]">
      <Sidebar
        userEmail={userEmail}
        onSignOut={onSignOut}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
        <header className="h-16 flex-shrink-0 border-b border-gray-200 dark:border-[#1F1F23] flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-2"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </Button>
          <div className="flex-1 min-w-0">
            <AdminTopNav userEmail={userEmail} onSignOut={onSignOut} />
          </div>
        </header>
        {/* min-h-0: flex child must shrink so overflow-auto on main is the scroll container (fixes wheel over tables). */}
        <div
          ref={(node) => {
            mainRef.current = node;
          }}
          className="min-h-0 flex-1 overflow-auto bg-white px-6 pb-6 pt-6 text-gray-900 [-webkit-overflow-scrolling:touch] dark:bg-[#0F0F12] dark:text-zinc-100"
        >
          <div className="mx-auto min-h-0 max-w-7xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
