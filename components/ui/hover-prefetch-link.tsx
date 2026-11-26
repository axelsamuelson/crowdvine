"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useRef,
  type ComponentProps,
  type MouseEvent,
} from "react";

import { scheduleHoverPrefetch } from "@/lib/navigation/hover-prefetch";

type HoverPrefetchLinkProps = ComponentProps<typeof Link>;

/**
 * Product-grid link. `prefetch={false}` disables Next's viewport observer.
 * A prefetch starts only after the pointer rests for 150ms, one at a time.
 */
export function HoverPrefetchLink({
  href,
  onMouseEnter,
  onMouseLeave,
  prefetch = false,
  ...rest
}: HoverPrefetchLinkProps) {
  const router = useRouter();
  const pending = useRef<{ cancel: () => void } | null>(null);

  const cancelPending = useCallback(() => {
    pending.current?.cancel();
    pending.current = null;
  }, []);

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onMouseEnter?.(e);
      if (typeof href !== "string" || !href) return;
      cancelPending();
      pending.current = scheduleHoverPrefetch({
        href,
        prefetch: (target) => router.prefetch(target),
      });
    },
    [cancelPending, href, onMouseEnter, router],
  );

  const handleMouseLeave = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      cancelPending();
      onMouseLeave?.(e);
    },
    [cancelPending, onMouseLeave],
  );

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...rest}
    />
  );
}
