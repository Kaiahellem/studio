"use client";

import { useState } from "react";
import { t } from "@/i18n/nb";

const h = t.client.handover;

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={label}
        className={className}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            // Clipboard can be blocked; the value is visible on the page anyway.
          }
        }}
      >
        {h.copy}
      </button>
      <span role="status" className="sr-only">
        {copied ? h.copied(value) : ""}
      </span>
    </>
  );
}
