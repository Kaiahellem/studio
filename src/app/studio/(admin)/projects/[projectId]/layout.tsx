import Link from "next/link";
import { Suspense } from "react";
import { NavLink } from "@/components/nav-link";
import { t } from "@/i18n/nb";

const n = t.studio.projectNav;

function ProjectNav({ projectId, current }: { projectId: string; current: boolean }) {
  const base = `/studio/projects/${projectId}`;
  const links = [
    { href: base, label: n.steps, exact: true },
    { href: `${base}/documents`, label: n.documents },
    { href: `${base}/site`, label: n.site },
    { href: `${base}/handover`, label: n.handover },
    { href: `${base}/activity`, label: n.activity },
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

export default async function ProjectLayout({ children, params }: LayoutProps<"/studio/projects/[projectId]">) {
  const { projectId } = await params;
  return (
    <>
      <nav aria-label={n.label} className="-mt-4 mb-8 flex gap-6 overflow-x-auto border-b border-line pb-3 text-sm">
        <Suspense fallback={<ProjectNav projectId={projectId} current={false} />}>
          <ProjectNav projectId={projectId} current />
        </Suspense>
      </nav>
      {children}
    </>
  );
}
