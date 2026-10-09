import Link from "next/link";
import { Suspense } from "react";
import { NavLink } from "@/components/nav-link";
import { t } from "@/i18n/nb";

const n = t.client.nav;

function ProjectNav({ projectId, current }: { projectId: string; current: boolean }) {
  const links = [
    { href: `/p/${projectId}`, label: n.overview, exact: true },
    { href: `/p/${projectId}/dokumenter`, label: n.documents },
    { href: `/p/${projectId}/filer`, label: n.files },
    { href: `/p/${projectId}/overlevering`, label: n.handover },
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
  return (
    <>
      <nav aria-label={n.label} className="-mt-4 mb-10 flex gap-6 overflow-x-auto border-b border-line pb-3 text-sm">
        <Suspense fallback={<ProjectNav projectId={projectId} current={false} />}>
          <ProjectNav projectId={projectId} current />
        </Suspense>
      </nav>
      {children}
    </>
  );
}
