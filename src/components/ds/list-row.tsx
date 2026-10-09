import type { ReactNode } from "react";

// Rows separated by hairlines, no outer box, no zebra striping. Actions show on hover and on
// keyboard focus, and are always visible on touch devices (DESIGN.md, Lists and tables).
export function List({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="border-t border-hairline">
      {children}
    </ul>
  );
}

export function ListRow({ children, actions, className = "" }: { children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <li
      className={`group flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-hairline px-2 py-2 transition-colors duration-[120ms] hover:bg-subtle md:min-h-10 ${className}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {actions && (
        <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity duration-[120ms] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
          {actions}
        </div>
      )}
    </li>
  );
}
