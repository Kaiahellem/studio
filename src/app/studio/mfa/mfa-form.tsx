"use client";

import { useActionState } from "react";
import { verifyMfa } from "@/features/auth/mfa-actions";
import { Field, SubmitButton } from "@/components/form";
import { t } from "@/i18n/nb";

export function MfaForm({ next, factors }: { next: string; factors: { id: string; name: string }[] }) {
  const [state, action] = useActionState(verifyMfa, undefined);

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="next" value={next} />
      {factors.length > 1 ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="factorId" className="text-sm font-medium">
            {t.auth.mfa.factorLabel}
          </label>
          <select id="factorId" name="factorId" className="h-12 rounded-md border border-field-border bg-surface px-4">
            {factors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="factorId" value={factors[0]?.id ?? ""} />
      )}
      <Field
        label={t.auth.mfa.codeLabel}
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus
        className="font-mono text-xl tracking-[0.4em]"
        error={state?.error}
      />
      <SubmitButton full pendingText={t.auth.checkEmail.verifying}>{t.auth.mfa.submit}</SubmitButton>
    </form>
  );
}
