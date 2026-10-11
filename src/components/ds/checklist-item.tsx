"use client";

import { Check } from "lucide-react";
import { useId, useTransition } from "react";

// A 16px checkbox; the whole row is the click target (44px tall on mobile). Checked items
// turn --ink-secondary with a line-through (DESIGN.md, Checklist items).
export function ChecklistItem({
  label,
  checked,
  onToggle,
  hint,
}: {
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => Promise<unknown>;
  hint?: string;
}) {
  const id = useId();
  const [pending, start] = useTransition();
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-nav px-2 py-2 transition-colors duration-[120ms] hover:bg-hover md:min-h-9">
      <span className="relative mt-1 flex size-[18px] shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={pending}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            const next = e.target.checked;
            start(async () => {
              await onToggle(next);
            });
          }}
          className="peer size-[18px] cursor-pointer appearance-none rounded-check border border-control-border bg-card checked:border-primary-bg checked:bg-primary-bg disabled:opacity-60"
        />
        <Check size={14} strokeWidth={2.25} aria-hidden="true" className="pointer-events-none absolute left-0.5 top-0.5 hidden text-primary-text peer-checked:block" />
      </span>
      <span className="min-w-0">
        <span className={checked ? "text-ink-secondary line-through" : ""}>{label}</span>
        {hint && (
          <span id={`${id}-hint`} className="block text-small text-ink-secondary">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
