import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Icon } from "@/components/ds/icon";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { getMyProjects } from "@/features/hub/queries";
import { t } from "@/i18n/nb";

const c = t.client;

export const metadata: Metadata = { title: c.projectsTitle };

// One project (the usual case) goes straight to it; several get a short list.
export default async function ClientHome() {
  const { projects, firstName } = await getMyProjects();
  if (projects.length === 1) redirect(`/p/${projects[0].id}`);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={c.projectsTitle} eyebrow={c.greeting(firstName)} />
      {projects.length === 0 ? (
        <p className="text-ink-secondary">{c.noProjects}</p>
      ) : (
        <InsetGroupedList label={c.projectsTitle}>
          {projects.map((p) => (
            <InsetRow key={p.id}>
              <Link href={`/p/${p.id}`} className="flex items-center justify-between gap-3 py-1">
                <span>
                  <span className="block font-medium">{p.name}</span>
                  <span className="text-small text-ink-secondary">{p.clients?.name}</span>
                </span>
                <Icon icon={ChevronRight} className="text-ink-secondary" />
              </Link>
            </InsetRow>
          ))}
        </InsetGroupedList>
      )}
    </div>
  );
}
