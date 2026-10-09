import type { ReactNode } from "react";

export type Property = { label: string; value: ReactNode };

// Document-style properties under the page title: label and value, two columns, no box.
export function Properties({ items }: { items: Property[] }) {
  const shown = items.filter((i) => i.value !== null && i.value !== undefined && i.value !== "");
  if (shown.length === 0) return null;
  return (
    <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
      {shown.map((i) => (
        <div key={i.label} className="contents">
          <dt className="text-label text-ink-secondary">{i.label}</dt>
          <dd className="min-w-0 text-body">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
