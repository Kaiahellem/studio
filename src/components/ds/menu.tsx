"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

// A disclosure menu: a button that opens a floating list of links or buttons. Escape and
// clicking outside close it; focus returns to the button.
export function Menu({ label, trigger, children }: { label: string; trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-nav text-ink-secondary hover:bg-hover hover:text-ink md:min-h-8 md:min-w-8"
      >
        {trigger}
      </button>
      <div
        id={id}
        hidden={!open}
        className="absolute right-0 z-30 mt-1 min-w-48 rounded-card bg-card p-1 shadow-overlay"
      >
        {children}
      </div>
    </div>
  );
}

export function MenuItem({ children, onSelect, href }: { children: ReactNode; onSelect?: () => void; href?: string }) {
  const cls = "flex min-h-11 w-full items-center gap-2 rounded-nav px-3 text-left text-body hover:bg-hover md:min-h-9";
  return href ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onSelect} className={cls}>
      {children}
    </button>
  );
}
