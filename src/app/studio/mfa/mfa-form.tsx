"use client";

import { useActionState } from "react";
import { verifyMfa } from "@/features/auth/mfa-actions";
import { Field, Select, SubmitButton } from "@/components/form";
import { t } from "@/i18n/nb";

export function MfaForm({ next, factors }: { next: string; factors: { id: string; name: string }[] }) {
  const [state, action] = useActionState(verifyMfa, undefined);

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="next" value={next} />
      {factors.length > 1 ? (
        <div>
          <Select label={t.auth.mfa.factorLabel} name="factorId" options={factors.map((f) => ({ value: f.id, label: f.name }))} />
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
        className="tracking-[0.4em] tabular-nums"
        error={state?.error}
      />
      <SubmitButton full pendingText={t.auth.checkEmail.verifying}>{t.auth.mfa.submit}</SubmitButton>
    </form>
  );
}
