import type { ReactNode } from "react";

// One short line in --ink-secondary and, if relevant, one ghost button. No illustrations.
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 py-4">
      <p className="text-ink-secondary">{children}</p>
      {action}
    </div>
  );
}
