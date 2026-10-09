import { Field, TextArea } from "@/components/form";
import { t } from "@/i18n/nb";

const s = t.studio.clients;

export type ClientDefaults = {
  name?: string;
  org_number?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  internal_notes?: string | null;
};

export function ClientFields({ defaults = {} }: { defaults?: ClientDefaults }) {
  return (
    <>
      <Field label={s.name} name="name" required defaultValue={defaults.name ?? ""} autoComplete="organization" />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={s.orgNumber} name="org_number" defaultValue={defaults.org_number ?? ""} inputMode="numeric" />
        <Field label={s.contactPhone} name="contact_phone" type="tel" defaultValue={defaults.contact_phone ?? ""} />
      </div>
      <Field label={s.contactEmail} name="contact_email" type="email" defaultValue={defaults.contact_email ?? ""} />
      <Field label={s.address} name="address" defaultValue={defaults.address ?? ""} autoComplete="street-address" />
      <TextArea label={s.internalNotes} hint={s.internalNotesHint} name="internal_notes" defaultValue={defaults.internal_notes ?? ""} />
    </>
  );
}
