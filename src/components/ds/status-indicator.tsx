import { CircleCheck } from "lucide-react";
import { Icon } from "./icon";

// Empty circle (not started), half circle (in progress), check (done). Decorative: the status
// is always also written in a tag next to it.
export function StatusIndicator({ status }: { status: "pending" | "active" | "done" }) {
  if (status === "done") return <Icon icon={CircleCheck} className="text-sage-fg" />;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={`shrink-0 ${status === "active" ? "text-slate-fg" : "text-ink-disabled"}`}>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {status === "active" && <path d="M8 1.75 A6.25 6.25 0 0 1 8 14.25 Z" fill="currentColor" />}
    </svg>
  );
}
