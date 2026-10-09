import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";
import { requireAdmin } from "@/lib/auth/session";
import { t } from "@/i18n/nb";

// The guard sits inside Suspense so the shell can render while the session is checked.
async function AdminGate({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}

export default function AdminLayout({ children }: LayoutProps<"/studio">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/studio" className="font-serif text-xl">
            {t.app.studioName}
          </Link>
          <nav aria-label="Hovedmeny" className="flex items-center gap-6 text-sm">
            <Link href="/studio">{t.studio.nav.dashboard}</Link>
            <Link href="/studio/sikkerhet">{t.studio.nav.security}</Link>
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
