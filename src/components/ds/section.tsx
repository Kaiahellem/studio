import type { ReactNode } from "react";
import { cardClass } from "./card";

// A section: Title L heading on the canvas, content in a floating card below. `card={false}`
// when the content brings its own cards (lists, grids of cards).
export function Section({
  id,
  title,
  actions,
  children,
  card = true,
  padded = true,
  level = 2,
  description,
}: {
  id: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  card?: boolean;
  padded?: boolean;
  level?: 2 | 3;
  description?: ReactNode;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Heading id={id} className={level === 2 ? "text-title-l" : "text-title-m"}>
            {title}
          </Heading>
          {description && <p className="mt-1 text-ink-secondary">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {card ? <div className={`${cardClass("card", padded)} ${padded ? "flex flex-col gap-5" : ""}`}>{children}</div> : children}
    </section>
  );
}
