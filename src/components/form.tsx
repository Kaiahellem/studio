"use client";

import {
  useActionState,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui";

export type FormState = { error?: string; message?: string } | undefined;

const controlClass = (error?: string, extra = "") =>
  `w-full rounded-md border bg-surface px-4 text-base text-ink placeholder:text-muted ${
    error ? "border-danger" : "border-field-border"
  } ${extra}`;

function useFieldIds(id: string | undefined, hint?: string, error?: string) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return { inputId, hintId, errorId, describedBy: [hintId, errorId].filter(Boolean).join(" ") || undefined };
}

function FieldFrame({
  label,
  hint,
  error,
  ids,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  ids: ReturnType<typeof useFieldIds>;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={ids.inputId} className="text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={ids.hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={ids.errorId} className="text-sm font-medium text-danger">
          {/* Icon + text, so the error isn't conveyed by colour alone. */}
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string };

// Label, hint and error are always wired to the control so screen readers announce them.
export function Field({ label, hint, error, id, className, ...input }: FieldProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldFrame label={label} hint={hint} error={error} ids={ids}>
      <input
        id={ids.inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={controlClass(error, `h-12 ${className ?? ""}`)}
        {...input}
      />
    </FieldFrame>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string };

export function TextArea({ label, hint, error, id, className, rows = 4, ...input }: TextAreaProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldFrame label={label} hint={hint} error={error} ids={ids}>
      <textarea
        id={ids.inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={controlClass(error, `py-3 leading-relaxed ${className ?? ""}`)}
        {...input}
      />
    </FieldFrame>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
};

export function Select({ label, hint, error, id, options, className, ...select }: SelectProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldFrame label={label} hint={hint} error={error} ids={ids}>
      <select
        id={ids.inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={controlClass(error, `h-12 ${className ?? ""}`)}
        {...select}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

export function Checkbox({ label, id, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex items-center gap-3">
      <input id={inputId} type="checkbox" className="size-5 accent-accent" {...input} />
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  full = false,
}: {
  children: ReactNode;
  pendingText: string;
  variant?: keyof typeof buttonClass;
  full?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonClass[variant]} ${full ? "h-12 w-full text-base sm:w-auto" : ""}`}>
      {pending ? pendingText : children}
    </button>
  );
}

export function SecondaryButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonClass.link} font-medium text-ink disabled:opacity-70`}>
      {children}
    </button>
  );
}

// Announced by screen readers when it appears.
export function FormMessage({ error, message }: { error?: string; message?: string }) {
  return (
    <div aria-live="polite" role="status">
      {error && (
        <p role="alert" className="rounded-md bg-danger-surface px-4 py-3 text-sm text-danger">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
      {message && !error && (
        <p className="rounded-md bg-success-surface px-4 py-3 text-sm text-success">
          <span aria-hidden="true">✓ </span>
          {message}
        </p>
      )}
    </div>
  );
}

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

// A form bound to a server action, with a message area for errors and confirmations.
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  className = "flex flex-col gap-6",
}: {
  action: Action;
  children: ReactNode;
  submitLabel: string;
  pendingLabel: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      <FormMessage error={state?.error} message={state?.message} />
      <div>
        <SubmitButton pendingText={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

// A single button that runs a server action, optionally after a confirmation, and shows
// any error next to it.
export function ActionButton({
  action,
  label,
  ariaLabel,
  confirm,
  variant = "small",
  hidden,
}: {
  action: Action;
  label: string;
  ariaLabel?: string;
  confirm?: string;
  variant?: keyof typeof buttonClass;
  hidden?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex flex-col gap-1"
    >
      {hidden && Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <ActionButtonInner label={label} ariaLabel={ariaLabel} variant={variant} />
      {state?.error && (
        <p role="alert" className="max-w-xs text-xs text-danger">
          <span aria-hidden="true">⚠ </span>
          {state.error}
        </p>
      )}
    </form>
  );
}

function ActionButtonInner({ label, ariaLabel, variant }: { label: string; ariaLabel?: string; variant: keyof typeof buttonClass }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-label={ariaLabel} className={buttonClass[variant]}>
      {label}
    </button>
  );
}
