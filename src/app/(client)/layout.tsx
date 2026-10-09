import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AppShell, type NavGroup } from "@/components/ds/app-shell";
import { LogoutButton } from "@/components/logout-button";
import { getMyProjects } from "@/features/hub/queries";
import { t } from "@/i18n/nb";

const n = t.client.nav;

// The sidebar lists the client's own projects and their sections; with one project the
// project level is skipped (DESIGN.md, Layout). Changes and maintenance appear after launch.
async function ClientShell({ children }: { children: ReactNode }) {
  const { projects, firstName } = await getMyProjects();
  const sections = (p: (typeof projects)[number]) => [
    { href: `/p/${p.id}`, label: n.overview, exact: true },
    { href: `/p/${p.id}/dokumenter`, label: n.documents },
    { href: `/p/${p.id}/filer`, label: n.files },
    ...(p.live_url
      ? [
          { href: `/p/${p.id}/endringer`, label: n.requests },
          { href: `/p/${p.id}/vedlikehold`, label: n.maintenance },
        ]
      : []),
    { href: `/p/${p.id}/overlevering`, label: n.handover },
  ];
  const groups: NavGroup[] =
    projects.length === 1 ? [{ items: sections(projects[0]) }] : projects.map((p) => ({ label: p.name, items: sections(p) }));

  return (
    <AppShell
      brand={
        <Link href="/" className="rounded-sm">
          {projects[0]?.clients?.name ?? t.app.name}
        </Link>
      }
      groups={groups}
      footer={
        <div className="flex flex-col gap-1">
          {firstName && <p className="text-small text-ink-secondary">{t.client.signedInAs(firstName)}</p>}
          <LogoutButton />
          <Link href="/personvern" className="text-small text-ink-secondary underline underline-offset-3 hover:text-ink">
            {t.common.privacy}
          </Link>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}

export default function ClientLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-ink-secondary">
          {t.common.loading}
        </p>
      }
    >
      <ClientShell>{children}</ClientShell>
    </Suspense>
  );
}
