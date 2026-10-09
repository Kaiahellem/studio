"use client";

import { useState } from "react";
import { Checkbox, Field, Select, TextArea } from "@/components/form";
import { t } from "@/i18n/nb";

const p = t.studio.projects;
const labels = t.studio.labels;

export type StepDefaults = {
  title?: string;
  description?: string | null;
  owner?: "client" | "studio";
  type?: "task" | "upload" | "approval" | "form" | "link";
  visible_to_client?: boolean;
  max_revision_rounds?: number | null;
  form_definition_id?: string | null;
  due_date?: string | null;
};

// Fields for adding or editing a step. Type-specific fields appear only for that type.
export function StepFields({ defaults = {}, forms }: { defaults?: StepDefaults; forms: { id: string; title: string }[] }) {
  const [type, setType] = useState(defaults.type ?? "task");

  return (
    <>
      <Field label={p.stepTitle} name="title" required defaultValue={defaults.title ?? ""} />
      <TextArea label={p.stepDescription} name="description" rows={3} defaultValue={defaults.description ?? ""} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Select
          label={p.stepOwner}
          name="owner"
          defaultValue={defaults.owner ?? "client"}
          options={(["client", "studio"] as const).map((o) => ({ value: o, label: labels.owner[o] }))}
        />
        <Select
          label={p.stepType}
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          options={(["task", "upload", "approval", "form", "link"] as const).map((v) => ({ value: v, label: labels.type[v] }))}
        />
      </div>
      {type === "approval" && (
        <Field
          label={p.maxRounds}
          hint={p.maxRoundsHint}
          name="max_revision_rounds"
          type="number"
          min={0}
          max={20}
          inputMode="numeric"
          defaultValue={defaults.max_revision_rounds ?? 2}
        />
      )}
      {type === "form" && (
        <Select
          label={p.formDefinition}
          name="form_definition_id"
          required
          defaultValue={defaults.form_definition_id ?? ""}
          options={[{ value: "", label: "–" }, ...forms.map((f) => ({ value: f.id, label: f.title }))]}
        />
      )}
      <Field label={p.dueDate} name="due_date" type="date" defaultValue={defaults.due_date ?? ""} />
      <Checkbox label={p.stepVisible} name="visible_to_client" defaultChecked={defaults.visible_to_client ?? true} />
    </>
  );
}
