"use client";

import { ChevronRight } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

// A real <button> with aria-expanded; 12px chevron rotating 90°, children indented 20px,
// 120ms, no layout jump (DESIGN.md, Toggle rows).
export function ToggleRow({
  summary,
  children,
  defaultOpen = false,
  trailing,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  trailing?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div>
      <div className="flex items-center gap-2 pr-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-nav px-2 text-left transition-colors duration-[120ms] hover:bg-hover"
        >
          <ChevronRight
            size={12}
            strokeWidth={1.5}
            aria-hidden="true"
            className={`shrink-0 text-ink-secondary transition-transform duration-[120ms] ease-out ${open ? "rotate-90" : ""}`}
          />
          <span className="min-w-0 flex-1">{summary}</span>
        </button>
        {trailing}
      </div>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}

