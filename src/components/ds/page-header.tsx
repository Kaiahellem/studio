import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { PropertiesCard, type Property } from "./properties";

// Breadcrumbs and Title XL directly on the canvas, no card; the properties card below.
export function PageHeader({
  title,
  trail = [],
  eyebrow,
  properties = [],
  propertiesLabel,
  actions,
}: {
  title: string;
  trail?: Crumb[];
  eyebrow?: ReactNode;
  properties?: Property[];
  propertiesLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6">
      <div>
        <Breadcrumbs trail={trail} current={title} />
        {eyebrow && <p className="mb-2 text-small text-ink-secondary">{eyebrow}</p>}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="min-w-0 text-title-xl">{title}</h1>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
      <PropertiesCard items={properties} label={propertiesLabel} />
    </header>
  );
}
