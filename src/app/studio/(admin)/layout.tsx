import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";
import { NavLink } from "@/components/nav-link";
import { requireAdmin } from "@/lib/auth/session";
import { t } from "@/i18n/nb";

// The guard sits inside Suspense so the shell can render while the session is checked.
async function AdminGate({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}

function NavLinks({ current }: { current: boolean }) {
  const links = [
    { href: "/studio", label: t.studio.nav.dashboard, exact: true },
    { href: "/studio/clients", label: t.studio.nav.clients },
    { href: "/studio/sikkerhet", label: t.studio.nav.security },
  ];
  return links.map((l) =>
    current ? (
      <NavLink key={l.href} href={l.href} exact={l.exact}>
        {l.label}
      </NavLink>
    ) : (
      <Link key={l.href} href={l.href}>
        {l.label}
      </Link>
    ),
  );
}

export default function AdminLayout({ children }: LayoutProps<"/studio">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/studio" className="font-serif text-xl">
            {t.app.studioName}
          </Link>
          <nav aria-label={t.studio.nav.label} className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {/* The current-page marker needs the URL, which is only known at request time. */}
            <Suspense fallback={<NavLinks current={false} />}>
              <NavLinks current />
            </Suspense>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8">
        <Suspense fallback={<p className="text-muted">{t.common.loading}</p>}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  );
}
