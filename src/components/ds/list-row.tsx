import type { ReactNode } from "react";
import { cardClass } from "./card";

// Inset grouped list (DESIGN.md, Lists): rows in a card, 48px tall, 20px side padding,
// separators inset to align with the text and none after the last row. Hover keeps the
// card's radius on the first and last row. Actions show on hover and keyboard focus, and are
// always visible on touch devices.
export function InsetGroupedList({ children, label, inCard = true }: { children: ReactNode; label?: string; inCard?: boolean }) {
  return (
    <ul aria-label={label} className={inCard ? cardClass("card", false) : ""}>
      {children}
    </ul>
  );
}

export function InsetRow({ children, actions, inset = 0 }: { children: ReactNode; actions?: ReactNode; inset?: number }) {
  return (
    <li className="group relative flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 transition-colors duration-[120ms] first:rounded-t-card last:rounded-b-card hover:bg-hover md:px-5">
      <div className="min-w-0 flex-1">{children}</div>
      {actions && (
        <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity duration-[120ms] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
          {actions}
        </div>
      )}
      <span
        aria-hidden="true"
        style={{ left: `calc(${inset}px + 1.25rem)` }}
        className="absolute bottom-0 right-0 h-px bg-separator group-last:hidden"
      />
    </li>
  );
}
