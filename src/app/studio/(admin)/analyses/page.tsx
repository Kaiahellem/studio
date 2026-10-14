import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ButtonLink } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { Icon } from "@/components/ds/icon";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Tag } from "@/components/ds/tag";
import { listAnalyses } from "@/features/analysis/queries";
import { statusTone } from "@/features/analysis/status";
import { formatDate } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

const a = t.studio.analysis;

export const metadata: Metadata = { title: a.heading };

export default async function AnalysesPage() {
  const analyses = await listAnalyses();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={a.heading}
        actions={
          <ButtonLink href="/studio/analyses/new" variant="primary">
            {a.new}
          </ButtonLink>
        }
      />
      <p className="max-w-prose text-ink-secondary">{a.intro}</p>
      {analyses.length === 0 ? (
        <Card>
          <EmptyState>{a.empty}</EmptyState>
        </Card>
      ) : (
        <InsetGroupedList label={a.listLabel}>
          {analyses.map((item) => (
            <InsetRow key={item.id}>
              <Link href={`/studio/analyses/${item.id}`} className="flex items-center justify-between gap-4 py-1">
                <span className="min-w-0">
                  <span className="block font-medium">{item.businessName}</span>
                  <span className="block text-body-compact text-ink-secondary [overflow-wrap:anywhere]">
                    {item.url.replace(/^https?:\/\//, "")}
                    {item.clientName && ` · ${item.clientName}`}
                    {" · "}
                    {item.latest ? a.lastRun(formatDate(item.latest.startedAt)) : a.neverRun}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {item.latest && <Tag tone={statusTone[item.latest.status]}>{a.status[item.latest.status]}</Tag>}
                  <Icon icon={ChevronRight} className="text-ink-secondary" />
                </span>
              </Link>
            </InsetRow>
          ))}
        </InsetGroupedList>
      )}
    </div>
  );
}
