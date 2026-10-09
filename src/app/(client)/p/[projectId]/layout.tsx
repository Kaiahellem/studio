import Link from "next/link";
import { Suspense } from "react";
import { NavLink } from "@/components/nav-link";
import { hasLaunched } from "@/features/maintenance/queries";
import { t } from "@/i18n/nb";

const n = t.client.nav;

function ProjectNav({ projectId, current, launched }: { projectId: string; current: boolean; launched: boolean }) {
  const links = [
    { href: `/p/${projectId}`, label: n.overview, exact: true },
    { href: `/p/${projectId}/dokumenter`, label: n.documents },
    { href: `/p/${projectId}/filer`, label: n.files },
    { href: `/p/${projectId}/overlevering`, label: n.handover },
    // Change requests and maintenance belong to the time after launch.
    ...(launched
      ? [
          { href: `/p/${projectId}/endringer`, label: n.requests },
          { href: `/p/${projectId}/vedlikehold`, label: n.maintenance },
        ]
      : []),
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

export default async function ProjectLayout({ children, params }: LayoutProps<"/p/[projectId]">) {
  const { projectId } = await params;
  const launched = await hasLaunched(projectId);
  return (
    <>
      <nav aria-label={n.label} className="-mt-4 mb-10 flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-3 text-sm">
        <Suspense fallback={<ProjectNav projectId={projectId} current={false} launched={launched} />}>
          <ProjectNav projectId={projectId} current launched={launched} />
        </Suspense>
      </nav>
      {children}
    </>
  );
}
