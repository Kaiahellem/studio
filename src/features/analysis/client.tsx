"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ds/button";
import { ActionForm, TextArea } from "@/components/form";
import { formatNumber } from "@/lib/format/nb";
import { t } from "@/i18n/nb";
import { submitAnswerAction } from "./actions";

const a = t.studio.analysis;

// While Portal is working, the page re-renders every few seconds to show progress.
export function RefreshWhileWorking({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}

// Manual mode (docs/PLAN-ANALYSIS.md §2.1): copy or download the bundle, run it in Claude,
// paste the answer back.
export function ManualPanel({
  runId,
  bundle,
  tokens,
  tooLarge,
  downloadHref,
}: {
  runId: string;
  bundle: string;
  tokens: number;
  tooLarge: boolean;
  downloadHref: string;
}) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(bundle);
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex list-decimal flex-col gap-1 pl-5 marker:text-ink-secondary">
        <li>{a.manual.step1}</li>
        <li>{a.manual.step2}</li>
        <li>{a.manual.step3}</li>
      </ol>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copy} className={buttonVariants.primary}>
            {a.manual.copy}
          </button>
          <a href={downloadHref} download className={buttonVariants.secondary}>
            {a.manual.download}
          </a>
        </div>
        <p className="text-small text-ink-secondary">
          {a.manual.size(formatNumber(tokens))} {tooLarge && a.manual.tooLarge}
        </p>
        <p className="text-small text-ink-secondary">{a.manual.privacy}</p>
        <p role="status" className="text-small text-sage-fg">
          {copied === "yes" ? a.manual.copied : ""}
        </p>
        {copied === "failed" && <p className="text-small text-brick-fg">{t.common.copyFailed}</p>}
      </div>
      <ActionForm action={submitAnswerAction.bind(null, runId)} submitLabel={a.manual.save} pendingLabel={t.common.loading}>
        <TextArea label={a.manual.pasteLabel} hint={a.manual.pasteHint} name="answer" rows={8} required spellCheck={false} className="text-mono" />
      </ActionForm>
    </div>
  );
}
