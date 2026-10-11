import { Pencil, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "./icon";

// "Legg til" actions (DESIGN.md): a full-width ghost row with a plus icon and a dashed
// --control-border, 10px radius. Opens the form below it; <details> keeps it keyboard and
// screen reader friendly without script.
export function AddRow({ label, children, defaultOpen = false }: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group" open={defaultOpen || undefined}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control border border-dashed border-control-border px-4 text-ink-secondary transition-colors duration-[120ms] hover:bg-hover hover:text-ink [&::-webkit-details-marker]:hidden">
        <Icon icon={Plus} />
        {label}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

// An edit panel opened from a ghost row action.
export function EditDisclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control px-3 text-small text-ink-secondary transition-colors duration-[120ms] hover:bg-hover hover:text-ink md:min-h-9 [&::-webkit-details-marker]:hidden">
        <Icon icon={Pencil} />
        {label}
      </summary>
      <div className="mt-3 rounded-inset bg-inset p-4">{children}</div>
    </details>
  );
}
