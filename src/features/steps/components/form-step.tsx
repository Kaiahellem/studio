"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Field, FormMessage, Select, SubmitButton, TextArea } from "@/components/form";
import { saveFormAction } from "@/features/steps/actions";
import { optionsOf, type Answers, type FormDefinition, type FormField } from "@/features/forms/schema";
import { t } from "@/i18n/nb";

function MultiSelect({ field, value, error }: { field: FormField; value: string[]; error?: string }) {
  const id = useId();
  return (
    <fieldset aria-describedby={[field.help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}>
      <legend className="mb-2 text-sm font-medium">{field.label}</legend>
      {field.help && (
        <p id={`${id}-help`} className="mb-2 text-sm text-muted">
          {field.help}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {optionsOf(field).map((o) => (
          <label key={o.value} className="flex items-center gap-3">
            <input type="checkbox" name={field.key} value={o.value} defaultChecked={value.includes(o.value)} className="size-5 accent-accent" />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm font-medium text-danger">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </fieldset>
  );
}

function Question({ field, value, error }: { field: FormField; value: Answers[string] | undefined; error?: string }) {
  const label = field.required ? field.label : `${field.label} ${t.forms.optional}`;
  const text = typeof value === "string" ? value : "";
  const common = { label, hint: field.help, name: field.key, error, required: field.required };

  switch (field.kind) {
    case "textarea":
      return <TextArea {...common} rows={4} defaultValue={text} />;
    case "url":
      return <Field {...common} type="url" inputMode="url" placeholder="https://" defaultValue={text} />;
    case "date":
      return <Field {...common} type="date" defaultValue={text} />;
    case "select":
      return (
        <Select {...common} defaultValue={text} options={[{ value: "", label: t.forms.choose }, ...optionsOf(field)]} />
      );
    case "multiselect":
      return <MultiSelect field={field} value={Array.isArray(value) ? value : []} error={error} />;
    case "boolean":
      return (
        <label className="flex items-center gap-3">
          <input type="checkbox" name={field.key} defaultChecked={value === true} className="size-5 accent-accent" />
          <span className="text-sm font-medium">{field.label}</span>
        </label>
      );
    default:
      return <Field {...common} defaultValue={text} />;
  }
}

// A questionnaire the client can save as a draft and submit when ready.
export function FormStep({ stepId, definition, initial }: { stepId: string; definition: FormDefinition; initial: Answers }) {
  const [state, action] = useActionState(saveFormAction.bind(null, stepId), undefined);
  const answers = state?.answers ?? initial;
  const errors = state?.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed submit, take keyboard and screen reader users straight to the first problem.
  useEffect(() => {
    if (!state?.fieldErrors) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], fieldset[aria-describedby*="error"] input')?.focus();
  }, [state]);

  return (
    // The key remounts the fields with the server's copy of the answers after each save.
    <form ref={formRef} key={JSON.stringify(answers)} action={action} className="flex flex-col gap-10" noValidate>
      {definition.sections.map((section) => (
        <fieldset key={section.title} className="flex flex-col gap-6">
          <legend className="mb-2 font-serif text-2xl">{section.title}</legend>
          {section.description && <p className="-mt-2 text-muted">{section.description}</p>}
          {section.fields.map((field) => (
            <Question key={field.key} field={field} value={answers[field.key]} error={errors[field.key]} />
          ))}
        </fieldset>
      ))}

      {/* Sticky on larger screens only; on a phone it would cover the questions. */}
      <div className="flex flex-col gap-4 border-t border-line bg-paper/95 py-4 sm:sticky sm:bottom-0 sm:backdrop-blur">
        <FormMessage error={state?.error} message={state?.message} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <SubmitButton full name="intent" value="submit" pendingText={t.forms.submitting}>
            {t.forms.submit}
          </SubmitButton>
          <SubmitButton full variant="secondary" name="intent" value="draft" pendingText={t.forms.submitting}>
            {t.forms.saveDraft}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
