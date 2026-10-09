import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/form";
import { Empty, PageHeader, buttonClass } from "@/components/ui";
import { listClients } from "@/features/clients/queries";
import { t } from "@/i18n/nb";

const s = t.studio.clients;

export const metadata: Metadata = { title: s.title };

export default async function ClientsPage({ searchParams }: PageProps<"/studio/clients">) {
  const [clients, { slettet }] = await Promise.all([listClients(), searchParams]);

  return (
    <>
      <PageHeader
        title={s.title}
        actions={
          <Link href="/studio/clients/new" className={buttonClass.primary}>
            {s.new}
          </Link>
        }
      />
      {typeof slettet === "string" && (
        <div className="mb-8">
          <FormMessage message={t.studio.privacy.deleted(slettet)} />
        </div>
      )}
      {clients.length === 0 ? (
        <Empty>{s.empty}</Empty>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {clients.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between">
              <Link href={`/studio/clients/${c.id}`} className="text-lg font-medium underline-offset-4 hover:underline">
                {c.name}
              </Link>
              <span className="text-sm text-muted">{c.projects.map((p) => p.name).join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
