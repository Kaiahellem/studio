"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { t } from "@/i18n/nb";
import { Icon } from "./icon";

// Native <dialog>: focus is trapped and restored, Escape closes, the page behind is inert.
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-md border border-hairline bg-sheet p-0 text-ink shadow-float backdrop:bg-ink/30"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-title-m">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-sm text-ink-secondary hover:bg-subtle hover:text-ink md:size-8">
            <Icon icon={X} label={t.ds.close} />
          </button>
        </div>
        <div className="text-body">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 pt-2">{footer}</div>}
      </div>
    </dialog>
  );
}

