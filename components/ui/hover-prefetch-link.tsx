"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useRef,
  type ComponentProps,
  type FocusEvent,
  type MouseEvent,
} from "react";

type HoverPrefetchLinkProps = ComponentProps<typeof Link>;

/**
 * Next.js App Router Link that does not prefetch on viewport entry.
 * Prefetches on hover / focus so PLP grids do not stampede PDP routes.
 */
export function HoverPrefetchLink({
  href,
  onMouseEnter,
  onFocus,
  prefetch = false,
  ...rest
}: HoverPrefetchLinkProps) {
  const router = useRouter();
  const didPrefetch = useRef(false);

  const prefetchOnce = useCallback(() => {
    if (didPrefetch.current) return;
    if (typeof href !== "string" || !href) return;
    didPrefetch.current = true;
    try {
      void router.prefetch(href);
    } catch {
      // ignore prefetch failures (offline / aborted navigations)
    }
  }, [href, router]);

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      prefetchOnce();
      onMouseEnter?.(e);
    },
    [onMouseEnter, prefetchOnce],
  );

  const handleFocus = useCallback(
    (e: FocusEvent<HTMLAnchorElement>) => {
      prefetchOnce();
      onFocus?.(e);
    },
    [onFocus, prefetchOnce],
  );

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...rest}
    />
  );
}
