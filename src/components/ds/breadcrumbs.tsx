import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@/i18n/nb";
import { Icon } from "./icon";

export type Crumb = { label: string; href: string };

// Above the page title. On mobile a single back link replaces the trail, so it never wraps.
export function Breadcrumbs({ trail, current }: { trail: Crumb[]; current: string }) {
  if (trail.length === 0) return null;
  const parent = trail[trail.length - 1];
  return (
    <>
      <nav aria-label={t.ds.breadcrumbs} className="mb-4 hidden text-small md:block">
        <ol className="flex flex-wrap items-center gap-x-2">
          {trail.map((c) => (
            <li key={c.href} className="flex items-center gap-x-2">
              <Link href={c.href} className="text-ink-secondary underline-offset-3 hover:text-ink hover:underline">
                {c.label}
              </Link>
              <span aria-hidden="true" className="text-ink-disabled">
                /
              </span>
            </li>
          ))}
          <li aria-current="page" className="text-ink">
            {current}
          </li>
        </ol>
      </nav>
      <Link href={parent.href} className="mb-4 inline-flex min-h-11 items-center gap-2 text-small text-ink-secondary hover:text-ink md:hidden">
        <Icon icon={ArrowLeft} />
        {parent.label}
      </Link>
    </>
  );
}
