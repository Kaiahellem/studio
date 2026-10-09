import { z } from "zod";
import { t } from "@/i18n/nb";

// Questionnaires are data (form_definitions.schema), so questions can change without code.

const option = z.union([z.string(), z.object({ value: z.string(), label: z.string() })]);

export const fieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string(),
  help: z.string().optional(),
  kind: z.enum(["text", "textarea", "url", "date", "select", "multiselect", "boolean"]),
  required: z.boolean().optional(),
  options: z.array(option).optional(),
});

export const formDefinitionSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      fields: z.array(fieldSchema),
    }),
  ),
});

export type FormField = z.infer<typeof fieldSchema>;
export type FormDefinition = z.infer<typeof formDefinitionSchema>;
export type AnswerValue = string | string[] | boolean | null;
export type Answers = Record<string, AnswerValue>;
export type FieldErrors = Record<string, string>;

export function parseDefinition(value: unknown): FormDefinition {
  return formDefinitionSchema.parse(value);
}

export function optionsOf(field: FormField): { value: string; label: string }[] {
  return (field.options ?? []).map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

export function allFields(definition: FormDefinition): FormField[] {
  return definition.sections.flatMap((s) => s.fields);
}

// Reads answers for exactly the defined fields; anything else in the form data is ignored.
export function answersFromFormData(definition: FormDefinition, formData: FormData): Answers {
  const answers: Answers = {};
  for (const field of allFields(definition)) {
    if (field.kind === "multiselect") {
      const allowed = new Set(optionsOf(field).map((o) => o.value));
      answers[field.key] = formData.getAll(field.key).map(String).filter((v) => allowed.has(v));
    } else if (field.kind === "boolean") {
      answers[field.key] = formData.get(field.key) === "on";
    } else {
      const raw = formData.get(field.key);
      const value = typeof raw === "string" ? raw.trim().slice(0, 10_000) : "";
      answers[field.key] = value === "" ? null : value;
    }
  }
  return answers;
}

const isEmpty = (v: AnswerValue | undefined) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export function validateAnswers(definition: FormDefinition, answers: Answers): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of allFields(definition)) {
    const value = answers[field.key];
    if (isEmpty(value)) {
      if (field.required) errors[field.key] = t.forms.required;
      continue;
    }
    if (field.kind === "url" && !(typeof value === "string" && /^https?:\/\/\S+\.\S+$/i.test(value))) {
      errors[field.key] = t.forms.invalidUrl;
    } else if (field.kind === "date" && !(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))) {
      errors[field.key] = t.forms.invalidDate;
    } else if (field.kind === "select" && !optionsOf(field).some((o) => o.value === value)) {
      errors[field.key] = t.forms.invalidOption;
    }
  }
  return errors;
}

// Readable value for summaries (admin view, submitted forms).
export function displayAnswer(field: FormField, value: AnswerValue | undefined): string | null {
  if (isEmpty(value)) return null;
  if (field.kind === "boolean") return value ? t.forms.yes : t.forms.no;
  const label = (v: string) => optionsOf(field).find((o) => o.value === v)?.label ?? v;
  if (Array.isArray(value)) return value.map(label).join(", ");
  return field.kind === "select" ? label(String(value)) : String(value);
}
