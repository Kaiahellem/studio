"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmLoginLink } from "@/features/auth/actions";
import { buttonVariants } from "@/components/ds/button";
import { FormMessage, SubmitButton } from "@/components/form";
import { t } from "@/i18n/nb";

export function ConfirmForm({ tokenHash, next }: { tokenHash: string; next: string }) {
  const [state, action] = useActionState(confirmLoginLink, undefined);

  if (state?.error) {
    return (
      <div className="flex flex-col gap-6">
        <FormMessage error={state.error} />
        <Link href={`/logg-inn?next=${encodeURIComponent(next)}`} className={`${buttonVariants.primary} sm:self-start`}>
          {t.auth.confirm.newLink}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="next" value={next} />
      <p className="text-body">{t.auth.confirm.body}</p>
      <SubmitButton full pendingText={t.auth.checkEmail.verifying}>{t.auth.confirm.submit}</SubmitButton>
    </form>
  );
}
