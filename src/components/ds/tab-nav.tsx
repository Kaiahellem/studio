"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { href: string; label: string; exact?: boolean };

// Sub-navigation inside a page (e.g. a project's sections): navigation items in a row, same
// 8px radius, --hover and --selected as the sidebar. Wraps instead of scrolling.
export function TabNav({ tabs, label }: { tabs: Tab[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const current = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-nav px-3 text-body transition-colors duration-[120ms] md:min-h-9 ${
                  current ? "bg-selected font-medium text-ink" : "text-ink-secondary hover:bg-hover hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
