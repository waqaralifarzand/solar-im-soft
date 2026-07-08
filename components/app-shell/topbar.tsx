"use client";

import { Search } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-8">
      <div />
      <button
        type="button"
        className="flex items-center gap-2 rounded-pill border border-border bg-white px-3 py-1.5 text-xs text-muted-foreground"
        aria-label="Open command palette"
      >
        <Search size={14} />
        <span>Search…</span>
        <kbd className="rounded-sm bg-surface px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>
    </header>
  );
}
