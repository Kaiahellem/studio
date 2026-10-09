"use client";

import { useActionState } from "react";
import { resendLogin, verifyLoginCode } from "@/features/auth/actions";
import { Field, FormMessage, SecondaryButton, SubmitButton } from "@/components/form";
import { t } from "@/i18n/nb";

export function CodeForm({ next }: { next: string }) {
  const [verifyState, verifyAction] = useActionState(verifyLoginCode, undefined);
  const [resendState, resendAction] = useActionState(resendLogin, undefined);

  return (
    <div className="flex flex-col gap-8">
      <form action={verifyAction} className="flex flex-col gap-6" noValidate>
        <input type="hidden" name="next" value={next} />
        <Field
          label={t.auth.checkEmail.codeLabel}
          hint={t.auth.checkEmail.codeHint}
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          className="font-mono text-xl tracking-[0.4em]"
          error={verifyState?.error}
        />
        <SubmitButton full pendingText={t.auth.checkEmail.verifying}>{t.auth.checkEmail.submit}</SubmitButton>
      </form>

      <form action={resendAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <div>
          <SecondaryButton>{t.auth.checkEmail.resend}</SecondaryButton>
        </div>
        <FormMessage message={resendState?.message} />
      </form>
    </div>
  );
}
