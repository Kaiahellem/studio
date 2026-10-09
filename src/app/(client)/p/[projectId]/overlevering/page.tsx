import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHandoverForProject } from "@/features/handover/queries";
import { HandoverView } from "@/features/handover/view";
import { requireClientAccess } from "@/features/hub/queries";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const h = t.client.handover;

export const metadata: Metadata = { title: h.heading };

export default async function ClientHandoverPage({ params }: PageProps<"/p/[projectId]/overlevering">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  await requireClientAccess(`/p/${projectId}/overlevering`);
  const data = await getHandoverForProject(projectId);

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-serif text-4xl tracking-tight">{h.heading}</h1>
        <p className="max-w-prose text-lg leading-relaxed text-muted">{h.notYet}</p>
      </div>
    );
  }
  return <HandoverView data={data} />;
}
