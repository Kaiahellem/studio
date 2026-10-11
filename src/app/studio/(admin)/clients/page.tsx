import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ButtonLink } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { Icon } from "@/components/ds/icon";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { FormMessage } from "@/components/form";
import { listClients } from "@/features/clients/queries";
import { compareNb } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

const s = t.studio.clients;

export const metadata: Metadata = { title: s.title };

export default async function ClientsPage({ searchParams }: PageProps<"/studio/clients">) {
  const [clients, { slettet }] = await Promise.all([listClients(), searchParams]);
  const sorted = [...clients].sort((a, b) => compareNb(a.name, b.name));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={s.title}
        actions={
          <ButtonLink href="/studio/clients/new" variant="primary">
            {s.new}
          </ButtonLink>
        }
      />
      {typeof slettet === "string" && <FormMessage message={t.studio.privacy.deleted(slettet)} />}
      {sorted.length === 0 ? (
        <Card>
          <p className="text-ink-secondary">{s.empty}</p>
        </Card>
      ) : (
        <InsetGroupedList label={s.title}>
          {sorted.map((c) => (
            <InsetRow key={c.id}>
              <Link href={`/studio/clients/${c.id}`} className="flex items-center justify-between gap-4 py-1">
                <span className="min-w-0">
                  <span className="block font-medium">{c.name}</span>
                  {c.projects.length > 0 && <span className="text-body-compact text-ink-secondary">{c.projects.map((p) => p.name).join(", ")}</span>}
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
