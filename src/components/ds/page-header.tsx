import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { Properties, type Property } from "./properties";

// Breadcrumbs, one Title XL per page, then the properties block (DESIGN.md, Page header).
export function PageHeader({
  title,
  trail = [],
  eyebrow,
  properties = [],
  actions,
}: {
  title: string;
  trail?: Crumb[];
  eyebrow?: ReactNode;
  properties?: Property[];
  actions?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-col gap-6">
      <div>
        <Breadcrumbs trail={trail} current={title} />
        {eyebrow && <p className="mb-2 text-small text-ink-secondary">{eyebrow}</p>}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="min-w-0 text-title-xl">{title}</h1>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
      <Properties items={properties} />
    </header>
  );
}
