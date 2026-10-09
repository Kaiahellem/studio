"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { cardClass } from "@/components/ds/card";
import { Checkbox, Field, FieldError, FormMessage, Select, SubmitButton, TextArea } from "@/components/form";
import { saveFormAction } from "@/features/steps/actions";
import { optionsOf, type Answers, type FormDefinition, type FormField } from "@/features/forms/schema";
import { t } from "@/i18n/nb";

function MultiSelect({ field, value, error }: { field: FormField; value: string[]; error?: string }) {
  const id = useId();
  return (
    <fieldset aria-describedby={[field.help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ") || undefined} className="flex flex-col gap-1.5">
      <legend className="mb-1 text-label">{field.label}</legend>
      <div className="flex flex-col">
        {optionsOf(field).map((o) => (
          <Checkbox key={o.value} label={o.label} name={field.key} value={o.value} defaultChecked={value.includes(o.value)} />
        ))}
      </div>
      {field.help && (
        <p id={`${id}-help`} className="text-small text-ink-secondary">
          {field.help}
        </p>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
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
      return <Checkbox label={field.label} name={field.key} defaultChecked={value === true} />;
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
    <form ref={formRef} key={JSON.stringify(answers)} action={action} className="flex flex-col gap-4" noValidate>
      {/* One card per section of the questionnaire. */}
      {definition.sections.map((section) => (
        <fieldset key={section.title} className={`flex flex-col gap-5 ${cardClass("card")}`}>
          {/* A heading inside the legend: grouped for forms mode, and reachable by heading navigation. */}
          <legend className="float-left w-full">
            <h2 className="text-title-m">{section.title}</h2>
          </legend>
          {section.description && <p className="-mt-3 text-ink-secondary">{section.description}</p>}
          {section.fields.map((field) => (
            <Question key={field.key} field={field} value={answers[field.key]} error={errors[field.key]} />
          ))}
        </fieldset>
      ))}

      {/* Raised and sticky on larger screens; on a phone it would cover the questions. */}
      <div className={`mt-2 flex flex-col gap-4 sm:sticky sm:bottom-4 ${cardClass("raised")}`}>
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
