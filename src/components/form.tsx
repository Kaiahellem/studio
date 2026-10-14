"use client";

import { Check, CircleAlert, CircleCheck } from "lucide-react";
import {
  useActionState,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { useFormStatus } from "react-dom";
import { buttonVariants, type ButtonVariant } from "@/components/ds/button";
import { Dialog } from "@/components/ds/dialog";
import { Icon } from "@/components/ds/icon";
import { formatWeek } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

export type FormState = { error?: string; message?: string } | undefined;

// Inputs (DESIGN.md): --card background, --control-border, 10px radius, 44px tall, 16px text;
// on focus the border turns --focus and the ring appears; label always visible above; helper
// text below in Small; errors in brick with an icon, linked through aria-describedby.
const controlClass = (error?: string, extra = "") =>
  `w-full rounded-control border bg-card px-3 text-[16px] text-ink transition-colors duration-[120ms] placeholder:text-ink-secondary focus:border-focus disabled:opacity-60 ${
    error ? "border-brick-fg" : "border-control-border"
  } ${extra}`;

function useFieldIds(id: string | undefined, hint?: boolean, error?: string) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return { inputId, hintId, errorId, describedBy: [hintId, errorId].filter(Boolean).join(" ") || undefined };
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-2 text-small font-medium text-brick-fg">
      <Icon icon={CircleAlert} className="mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

function FieldFrame({
  label,
  hint,
  error,
  ids,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  ids: ReturnType<typeof useFieldIds>;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={ids.inputId} className="text-label">
        {label}
      </label>
      {children}
      {hint && (
        <p id={ids.hintId} className="text-small text-ink-secondary">
          {hint}
        </p>
      )}
      {error && <FieldError id={ids.errorId}>{error}</FieldError>}
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string };

export function Field({ label, hint, error, id, className, type, defaultValue, onChange, ...input }: FieldProps) {
  // Date fields show the week number, since Norwegian businesses plan by week (DESIGN.md).
  const isDate = type === "date";
  const [week, setWeek] = useState(isDate && typeof defaultValue === "string" && defaultValue ? formatWeek(defaultValue) : "");
  const hintText = [hint, isDate ? week : ""].filter(Boolean).join(" · ");
  const ids = useFieldIds(id, Boolean(hintText), error);
  return (
    <FieldFrame label={label} hint={hintText || undefined} error={error} ids={ids}>
      <input
        id={ids.inputId}
        type={type}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={controlClass(error, `min-h-11 ${className ?? ""}`)}
        onChange={(e) => {
          if (isDate) setWeek(e.target.value ? formatWeek(e.target.value) : "");
          onChange?.(e);
        }}
        {...input}
      />
    </FieldFrame>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string; grow?: boolean };

// `grow` lets the field grow as you type (comments).
export function TextArea({ label, hint, error, id, className, rows = 4, grow = false, onInput, ...input }: TextAreaProps) {
  const ids = useFieldIds(id, Boolean(hint), error);
  return (
    <FieldFrame label={label} hint={hint} error={error} ids={ids}>
      <textarea
        id={ids.inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={controlClass(error, `py-2 leading-relaxed ${grow ? "resize-none overflow-hidden" : ""} ${className ?? ""}`)}
        onInput={(e) => {
          if (grow) {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight + 2}px`;
          }
          onInput?.(e);
        }}
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
  const ids = useFieldIds(id, Boolean(hint), error);
  return (
    <FieldFrame label={label} hint={hint} error={error} ids={ids}>
      <select
        id={ids.inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={controlClass(error, `min-h-11 ${className ?? ""}`)}
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

// 18px box, 4px radius, --control-border; checked fills with --primary-bg. The whole row is the
// click target (44px on mobile).
export function Checkbox({ label, id, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className="flex min-h-11 cursor-pointer items-center gap-3 md:min-h-9">
      <span className="relative flex size-[18px] shrink-0">
        <input
          id={inputId}
          type="checkbox"
          className="peer size-[18px] cursor-pointer appearance-none rounded-check border border-control-border bg-card checked:border-primary-bg checked:bg-primary-bg"
          {...input}
        />
        <Check size={14} strokeWidth={2.25} aria-hidden="true" className="pointer-events-none absolute left-0.5 top-0.5 hidden text-primary-text peer-checked:block" />
      </span>
      <span className="text-body">{label}</span>
    </label>
  );
}

type AnyVariant = ButtonVariant | "small" | "danger" | "link";

// Older call sites used these names.
function variantOf(v: AnyVariant): ButtonVariant {
  if (v === "small") return "secondary";
  if (v === "link") return "ghost";
  if (v === "danger") return "destructive";
  return v;
}

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  full = false,
  name,
  value,
}: {
  children: ReactNode;
  pendingText: string;
  variant?: AnyVariant;
  full?: boolean;
  // A named submit button tells the action which button was pressed.
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending || undefined}
      className={`${buttonVariants[variantOf(variant)]} ${full ? "w-full sm:w-auto" : ""}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function SecondaryButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonVariants.ghost}>
      {children}
    </button>
  );
}

// Announced by screen readers when it appears.
export function FormMessage({ error, message }: { error?: string; message?: string }) {
  return (
    <div aria-live="polite" role="status">
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-inset bg-brick-bg px-4 py-3 text-body text-brick-fg">
          <Icon icon={CircleAlert} className="mt-[5px]" />
          <span className="whitespace-pre-line">{error}</span>
        </p>
      )}
      {message && !error && (
        <p className="flex items-start gap-2 rounded-inset bg-sage-bg px-4 py-3 text-body text-sage-fg">
          <Icon icon={CircleCheck} className="mt-[5px]" />
          <span>{message}</span>
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
  submitVariant = "primary",
}: {
  action: Action;
  children: ReactNode;
  submitLabel: string;
  pendingLabel: string;
  className?: string;
  submitVariant?: AnyVariant;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      <FormMessage error={state?.error} message={state?.message} />
      <div>
        <SubmitButton pendingText={pendingLabel} variant={submitVariant}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

// One button that runs a server action. With `confirm` it first asks in a dialog;
// destructive actions always do (DESIGN.md, Buttons).
export function ActionButton({
  action,
  label,
  ariaLabel,
  confirm,
  variant = "secondary",
  hidden,
}: {
  action: Action;
  label: string;
  ariaLabel?: string;
  confirm?: string;
  variant?: AnyVariant;
  hidden?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [asking, setAsking] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const v = variantOf(variant);

  return (
    <form ref={form} action={formAction} className="inline-flex flex-col gap-1">
      {hidden && Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      {confirm ? (
        <button type="button" aria-label={ariaLabel} aria-haspopup="dialog" className={buttonVariants[v]} onClick={() => setAsking(true)}>
          {label}
        </button>
      ) : (
        <ActionButtonInner label={label} ariaLabel={ariaLabel} variant={v} />
      )}
      {confirm && (
        <Dialog
          open={asking}
          onClose={() => setAsking(false)}
          title={ariaLabel ?? label}
          footer={
            <>
              <button type="button" className={buttonVariants.secondary} onClick={() => setAsking(false)}>
                {t.common.cancel}
              </button>
              <button
                type="button"
                className={buttonVariants[v === "destructive" ? "destructive" : "primary"]}
                onClick={() => {
                  setAsking(false);
                  form.current?.requestSubmit();
                }}
              >
                {label}
              </button>
            </>
          }
        >
          {confirm}
        </Dialog>
      )}
      {state?.error && (
        <div role="alert" className="max-w-xs">
          <FieldError>{state.error}</FieldError>
        </div>
      )}
    </form>
  );
}

function ActionButtonInner({ label, ariaLabel, variant }: { label: string; ariaLabel?: string; variant: ButtonVariant }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-label={ariaLabel} className={buttonVariants[variant]}>
      {label}
    </button>
  );
}
