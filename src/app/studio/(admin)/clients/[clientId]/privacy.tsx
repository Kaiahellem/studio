import { ActionForm, Field } from "@/components/form";
import { Section, buttonClass } from "@/components/ui";
import { deleteClientAction } from "@/features/privacy/actions";
import { t } from "@/i18n/nb";

const p = t.studio.privacy;

export function Privacy({ clientId, clientName }: { clientId: string; clientName: string }) {
  return (
    <Section id="privacy" title={p.heading}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-start gap-3">
          <h3 className="font-serif text-xl">{p.exportTitle}</h3>
          <p className="text-sm text-muted">{p.exportBody}</p>
          {/* A plain link: the route handler streams the zip as a download. */}
          <a href={`/api/export/${clientId}`} className={buttonClass.secondary} download>
            {p.exportLink}
          </a>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-danger p-4">
          <h3 className="font-serif text-xl text-danger">{p.deleteTitle}</h3>
          <p className="text-sm">{p.deleteBody}</p>
          <ActionForm action={deleteClientAction.bind(null, clientId)} submitLabel={p.deleteButton} pendingLabel={t.common.loading}>
            <Field label={p.confirmLabel(clientName)} name="confirm" required autoComplete="off" />
          </ActionForm>
        </div>
      </div>
    </Section>
  );
}
