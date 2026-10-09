"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

// Label, hint and error are always wired to the input so screen readers announce them.
export function Field({ label, hint, error, id, className, ...input }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={`h-12 w-full rounded-md border bg-surface px-4 text-base text-ink placeholder:text-muted ${
          error ? "border-danger" : "border-field-border"
        } ${className ?? ""}`}
        {...input}
      />
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {/* Icon + text, so the error isn't conveyed by colour alone. */}
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ children, pendingText }: { children: ReactNode; pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="h-12 w-full rounded-md bg-accent px-6 text-base font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-70 sm:w-auto"
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function SecondaryButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm font-medium text-ink underline underline-offset-4 hover:no-underline disabled:opacity-70"
    >
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
