"use client";

import { useActionState } from "react";
import { requestLogin } from "@/features/auth/actions";
import { Field, SubmitButton } from "@/components/form";
import { t } from "@/i18n/nb";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(requestLogin, undefined);

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field
        label={t.auth.login.emailLabel}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        error={state?.error}
      />
      <SubmitButton full pendingText={t.auth.login.sending}>{t.auth.login.submit}</SubmitButton>
    </form>
  );
}
