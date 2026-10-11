"use client";

import { useActionState, useRef, useState, useTransition, type FormEvent } from "react";
import { Checkbox, Field, FormMessage, Select, SubmitButton } from "@/components/form";
import { addDocumentAction, createDocumentUploadAction } from "@/features/steps/admin-actions";
import { createClient } from "@/lib/supabase/browser";
import { t } from "@/i18n/nb";

const d = t.studio.documents;
const types = t.client.documents.type;
const statuses = t.client.documents.status;

export type DocumentDefaults = {
  type?: keyof typeof types;
  title?: string;
  status?: keyof typeof statuses;
  document_date?: string;
  step_id?: string | null;
  visible_to_client?: boolean;
};

export function DocumentFields({ defaults = {}, steps }: { defaults?: DocumentDefaults; steps: { id: string; title: string }[] }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label={d.type}
          name="type"
          defaultValue={defaults.type ?? "proposal"}
          options={(Object.keys(types) as (keyof typeof types)[]).map((k) => ({ value: k, label: types[k] }))}
        />
        <Select
          label={d.status}
          name="status"
          defaultValue={defaults.status ?? "sent"}
          options={(Object.keys(statuses) as (keyof typeof statuses)[]).map((k) => ({ value: k, label: statuses[k] }))}
        />
      </div>
      <Field label={d.title} name="title" required defaultValue={defaults.title ?? ""} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={d.date} name="document_date" type="date" defaultValue={defaults.document_date ?? ""} />
        <Select
          label={d.step}
          name="step_id"
          defaultValue={defaults.step_id ?? ""}
          options={[{ value: "", label: d.noStep }, ...steps.map((s) => ({ value: s.id, label: s.title }))]}
        />
      </div>
      <Checkbox label={d.visible} name="visible_to_client" defaultChecked={defaults.visible_to_client ?? true} />
    </>
  );
}

// New document: the PDF goes straight to Storage through a signed URL, then the row is saved.
export function AddDocumentForm({ projectId, steps }: { projectId: string; steps: { id: string; title: string }[] }) {
  const [state, dispatch] = useActionState(addDocumentAction.bind(null, projectId), undefined);
  const [uploadError, setUploadError] = useState<string>();
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(undefined);
    const form = e.currentTarget;
    const data = new FormData(form);
    data.delete("file");
    const file = fileRef.current?.files?.[0];

    if (file) {
      const ticket = await createDocumentUploadAction(projectId, { name: file.name, size: file.size, type: file.type });
      const uploaded = ticket.ok
        ? await createClient().storage.from("project-files").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type })
        : null;
      if (!ticket.ok || uploaded?.error) {
        setUploadError(t.client.upload.failed(file.name));
        return;
      }
      data.set("storage_path", ticket.path);
    }
    startTransition(() => dispatch(data));
    form.reset();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <DocumentFields steps={steps} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="document-file" className="text-label">
            {d.file}
          </label>
          <input ref={fileRef} id="document-file" name="file" type="file" accept="application/pdf,image/*"
            className="text-small text-ink-secondary file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-control file:border file:border-control-border file:bg-card file:px-3 file:text-body file:text-ink hover:file:bg-hover md:file:min-h-9"
          />
        </div>
        <Field label={d.link} hint={d.linkHint} name="external_url" type="url" />
      </div>
      <FormMessage error={uploadError ?? state?.error} message={state?.message} />
      <div>
        <SubmitButton pendingText={t.common.loading}>{d.add}</SubmitButton>
      </div>
    </form>
  );
}
