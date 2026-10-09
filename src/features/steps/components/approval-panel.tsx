"use client";

import { useActionState, useState } from "react";
import { ActionButton, FormMessage, SubmitButton, TextArea } from "@/components/form";
import { buttonClass } from "@/components/ui";
import { approveAction, requestChangesAction } from "@/features/steps/actions";
import { t } from "@/i18n/nb";

const a = t.client.approval;

// Approve, or ask for changes with a comment. Shown only while a round is open.
export function ApprovalPanel({ stepId }: { stepId: string }) {
  const [asking, setAsking] = useState(false);
  const [state, requestChanges] = useActionState(requestChangesAction.bind(null, stepId), undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <ActionButton action={approveAction.bind(null, stepId)} label={a.approve} confirm={a.confirmApprove} variant="primary" />
        {!asking && (
          <button type="button" className={buttonClass.secondary} onClick={() => setAsking(true)}>
            {a.requestChanges}
          </button>
        )}
      </div>

      {asking && (
        <form action={requestChanges} className="flex flex-col gap-4 rounded-lg border border-line bg-paper p-4 sm:p-6">
          <TextArea label={a.changesLabel} hint={a.changesHint} name="comment" rows={6} required autoFocus error={state?.error} />
          <div className="flex flex-wrap gap-3">
            <SubmitButton pendingText={t.forms.submitting}>{a.requestChanges}</SubmitButton>
            <button type="button" className={buttonClass.secondary} onClick={() => setAsking(false)}>
              {t.common.cancel}
            </button>
          </div>
          <FormMessage message={state?.message} />
        </form>
      )}
    </div>
  );
}
