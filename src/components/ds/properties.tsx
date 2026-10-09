import type { ReactNode } from "react";
import { cardClass } from "./card";

export type Property = { label: string; value: ReactNode };

// An iOS settings-style card: label left, value right, 48px rows, separators inset 20px from
// the left and none after the last row. On narrow screens the value moves under the label.
export function PropertiesCard({ items, label }: { items: Property[]; label?: string }) {
  const shown = items.filter((i) => i.value !== null && i.value !== undefined && i.value !== "");
  if (shown.length === 0) return null;
  return (
    <dl aria-label={label} className={cardClass("card", false)}>
      {shown.map((item, i) => (
        <div key={item.label} className="relative flex min-h-12 flex-col justify-center gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:px-5">
          <dt className="text-body text-ink-secondary">{item.label}</dt>
          <dd className="min-w-0 text-body text-ink sm:text-right">{item.value}</dd>
          {i < shown.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-4 right-0 h-px bg-separator md:left-5" />}
        </div>
      ))}
    </dl>
  );
}
