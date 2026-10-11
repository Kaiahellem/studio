import type { Metadata } from "next";
import { Card } from "@/components/ds/card";
import { PageHeader } from "@/components/ds/page-header";
import { ActionForm } from "@/components/form";
import { createClientAction } from "@/features/clients/actions";
import { t } from "@/i18n/nb";
import { ClientFields } from "../client-fields";

const s = t.studio.clients;

export const metadata: Metadata = { title: s.new };

export default function NewClientPage() {
  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <PageHeader title={s.new} trail={[{ label: s.title, href: "/studio/clients" }]} />
      <Card>
        <ActionForm action={createClientAction} submitLabel={s.create} pendingLabel={t.common.loading}>
          <ClientFields />
        </ActionForm>
      </Card>
    </div>
  );
}
