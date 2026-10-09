"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Marks the current section with aria-current, and underlines it so it's not colour alone.
export function NavLink({ href, exact = false, children }: { href: string; exact?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const current = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={current ? "font-medium underline underline-offset-8" : "hover:underline hover:underline-offset-8"}
    >
      {children}
    </Link>
  );
}
