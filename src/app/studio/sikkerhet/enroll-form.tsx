"use client";

import { useActionState } from "react";
import { enrollTotp, type EnrollState } from "@/features/auth/mfa-actions";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { t } from "@/i18n/nb";

const initial: EnrollState = { step: "idle" };

export function EnrollForm({ next }: { next: string }) {
  const [state, action] = useActionState(enrollTotp, initial);

  if (state.step === "idle") {
    return (
      <form action={action} className="flex flex-col gap-6">
        <input type="hidden" name="intent" value="start" />
        <Field label={t.auth.security.nameLabel} name="name" placeholder={t.auth.security.namePlaceholder} maxLength={60} />
        <FormMessage error={state.error} />
        <SubmitButton pendingText={t.common.loading}>{t.auth.security.start}</SubmitButton>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ol className="list-decimal space-y-2 pl-5 leading-relaxed">
        {t.auth.security.enrollSteps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URI from Supabase */}
      <img src={state.qrCode} alt={t.auth.security.qrAlt} width={200} height={200} className="rounded-md bg-white p-3" />
      <div>
        <p className="text-sm font-medium">{t.auth.security.secretLabel}</p>
        <p className="mt-1 break-all font-mono text-sm">{state.secret}</p>
      </div>
      <form action={action} className="flex flex-col gap-6" noValidate>
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="next" value={next} />
        <Field
          label={t.auth.mfa.codeLabel}
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          className="font-mono text-xl tracking-[0.4em]"
          error={state.error}
        />
        <SubmitButton pendingText={t.auth.checkEmail.verifying}>{t.auth.security.verify}</SubmitButton>
      </form>
    </div>
  );
}
