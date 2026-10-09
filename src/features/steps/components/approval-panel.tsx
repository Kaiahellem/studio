"use client";

import { useActionState, useRef, useState } from "react";
import { buttonVariants } from "@/components/ds/button";
import { Dialog } from "@/components/ds/dialog";
import { FormMessage, SubmitButton, TextArea } from "@/components/form";
import { decideAction } from "@/features/steps/actions";
import { t } from "@/i18n/nb";

const a = t.client.approval;

// The bottom of a review round: the comment field, then "Godkjenn" (primary) and "Be om
// endringer" (secondary). Approving is a permanent record, so it is confirmed in a dialog.
export function ApprovalPanel({ stepId }: { stepId: string }) {
  const [state, action] = useActionState(decideAction.bind(null, stepId), undefined);
  const [confirming, setConfirming] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const decision = useRef<HTMLInputElement>(null);

  return (
    <form ref={form} action={action} className="flex flex-col gap-4">
      <input ref={decision} type="hidden" name="decision" defaultValue="changes_requested" />
      <TextArea label={a.commentLabel} hint={a.commentHint} name="comment" rows={3} grow error={state?.error === a.changesRequired ? state.error : undefined} />
      <FormMessage error={state?.error !== a.changesRequired ? state?.error : undefined} message={state?.message} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className={`${buttonVariants.primary} w-full sm:w-auto`} aria-haspopup="dialog" onClick={() => setConfirming(true)}>
          {a.approve}
        </button>
        <span className="contents [&>button]:w-full sm:[&>button]:w-auto">
          <SubmitButton variant="secondary" pendingText={t.forms.submitting}>
            {a.requestChanges}
          </SubmitButton>
        </span>
      </div>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={a.approve}
        footer={
          <>
            <button type="button" className={buttonVariants.secondary} onClick={() => setConfirming(false)}>
              {t.common.cancel}
            </button>
            <button
              type="button"
              className={buttonVariants.primary}
              onClick={() => {
                setConfirming(false);
                if (decision.current) decision.current.value = "approved";
                form.current?.requestSubmit();
                // Back to the default for the next submit.
                queueMicrotask(() => {
                  if (decision.current) decision.current.value = "changes_requested";
                });
              }}
            >
              {a.approve}
            </button>
          </>
        }
      >
        {a.confirmApprove}
      </Dialog>
    </form>
  );
}
