import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ds/button";
import { Icon } from "@/components/ds/icon";
import { Section } from "@/components/ds/section";
import { ActionForm, Field } from "@/components/form";
import { deleteClientAction } from "@/features/privacy/actions";
import { t } from "@/i18n/nb";

const p = t.studio.privacy;

export function Privacy({ clientId, clientName }: { clientId: string; clientName: string }) {
  return (
    <Section id="privacy" title={p.heading}>
      <div className="flex flex-col items-start gap-3">
        <h3 className="text-title-s">{p.exportTitle}</h3>
        <p className="text-small text-ink-secondary">{p.exportBody}</p>
        {/* A plain link: the route handler streams the zip as a download. */}
        <a href={`/api/export/${clientId}`} className={buttonVariants.secondary} download>
          <Icon icon={Download} />
          {p.exportLink}
        </a>
      </div>
      {/* Colour carries meaning here, so the brick tint stands in for the inset grey. */}
      <div className="flex flex-col gap-3 rounded-inset bg-brick-bg p-4">
        <h3 className="text-title-s text-brick-fg">{p.deleteTitle}</h3>
        <p className="text-small text-brick-fg">{p.deleteBody}</p>
        <ActionForm action={deleteClientAction.bind(null, clientId)} submitLabel={p.deleteButton} pendingLabel={t.common.loading} submitVariant="destructive">
          <Field label={p.confirmLabel(clientName)} name="confirm" required autoComplete="off" />
        </ActionForm>
      </div>
    </Section>
  );
}
