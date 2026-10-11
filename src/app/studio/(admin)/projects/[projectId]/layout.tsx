import { Suspense } from "react";
import { TabNav } from "@/components/ds/tab-nav";
import { t } from "@/i18n/nb";

const n = t.studio.projectNav;

export default async function ProjectLayout({ children, params }: LayoutProps<"/studio/projects/[projectId]">) {
  const { projectId } = await params;
  const base = `/studio/projects/${projectId}`;
  const tabs = [
    { href: base, label: n.steps, exact: true },
    { href: `${base}/documents`, label: n.documents },
    { href: `${base}/site`, label: n.site },
    { href: `${base}/handover`, label: n.handover },
    { href: `${base}/maintenance`, label: n.maintenance },
    { href: `${base}/activity`, label: n.activity },
  ];
  return (
    <div className="flex flex-col gap-8">
      {/* The current-tab marker needs the URL, which is only known at request time. */}
      <Suspense fallback={<div className="min-h-11" />}>
        <TabNav tabs={tabs} label={n.label} />
      </Suspense>
      {children}
    </div>
  );
}
