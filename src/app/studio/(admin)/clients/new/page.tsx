import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/form";
import { PageHeader } from "@/components/ui";
import { createClientAction } from "@/features/clients/actions";
import { t } from "@/i18n/nb";
import { ClientFields } from "../client-fields";

const s = t.studio.clients;

export const metadata: Metadata = { title: s.new };

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={s.new}
        eyebrow={
          <Link href="/studio/clients" className="underline underline-offset-4 hover:no-underline">
            {s.title}
          </Link>
        }
      />
      <ActionForm action={createClientAction} submitLabel={s.create} pendingLabel={t.common.loading}>
        <ClientFields />
      </ActionForm>
    </div>
  );
}
