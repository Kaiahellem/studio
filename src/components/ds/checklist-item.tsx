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
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-sm px-2 py-2 hover:bg-subtle md:min-h-9">
      <span className="relative mt-[5px] flex size-4 shrink-0">
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
          className="peer size-4 cursor-pointer appearance-none rounded-[3px] border border-control-border bg-sheet checked:border-primary-bg checked:bg-primary-bg disabled:opacity-60"
        />
        <Check size={12} strokeWidth={2} aria-hidden="true" className="pointer-events-none absolute left-0.5 top-0.5 hidden text-primary-text peer-checked:block" />
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
