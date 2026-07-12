"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A slim top-of-viewport progress bar shown while a link click is navigating. Next.js 14 has
 * no built-in "navigation in progress" signal, so this listens for clicks on same-origin
 * internal links (the sidebar's next/link nav is the main case) and clears itself once the URL
 * actually changes — giving immediate visual feedback for the "click, then wait with nothing
 * happening" gap that otherwise invites double-clicking. Not tied to loading.tsx/Suspense, so
 * it's safe on every route including the ones that can't have a loading.tsx (see SCRATCHPAD.md
 * — a loading.tsx on a segment with a notFound()-capable descendant breaks that descendant's
 * 404 status code).
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setNavigating(true);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!navigating) return null;

  return (
    <div className="pointer-events-none fixed left-0 top-0 z-50 h-[3px] w-full overflow-hidden bg-transparent">
      <div className="h-full w-full origin-left scale-x-0 animate-route-progress bg-accent" />
    </div>
  );
}
