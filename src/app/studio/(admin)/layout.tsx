import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AppShell, type NavGroup } from "@/components/ds/app-shell";
import { LogoutButton } from "@/components/logout-button";
import { requireAdmin } from "@/lib/auth/session";
import { t } from "@/i18n/nb";

const n = t.studio.nav;

const groups: NavGroup[] = [
  {
    items: [
      { href: "/studio", label: n.dashboard, exact: true, icon: "overview" },
      { href: "/studio/clients", label: n.clients, icon: "clients" },
      { href: "/studio/change-requests", label: n.requests, icon: "inbox" },
      { href: "/studio/plans", label: n.plans, icon: "plans" },
    ],
  },
  {
    items: [
      { href: "/studio/settings", label: n.settings, icon: "settings" },
      { href: "/studio/sikkerhet", label: n.security, icon: "security" },
    ],
  },
];

// The guard sits inside Suspense so the shell can render while the session is checked.
async function AdminGate({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}

export default function AdminLayout({ children }: LayoutProps<"/studio">) {
  return (
    <AppShell
      wide
      brand={
        <Link href="/studio" className="rounded-nav">
          {t.app.studioName}
        </Link>
      }
      groups={groups}
      footer={<LogoutButton />}
    >
      <Suspense fallback={<p className="text-ink-secondary">{t.common.loading}</p>}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </AppShell>
  );
}
