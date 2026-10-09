import { ArrowRight, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { t } from "@/i18n/nb";
import { ButtonLink } from "./button";
import { Icon } from "./icon";

// The most important element in Portal (DESIGN.md, "Din tur" callout). Slate when something
// waits on the client, with one primary button; neutral with no button when it is my turn.
// Never more than one at the top of a page.
export function DinTur({
  title,
  children,
  action,
  waiting = true,
}: {
  title: string;
  children: ReactNode;
  action?: { label: string; href: string; ariaLabel?: string };
  waiting?: boolean;
}) {
  return (
    <section
      aria-labelledby="din-tur-heading"
      className={`flex gap-3 rounded-sm border p-4 ${waiting ? "border-slate-fg bg-slate-bg" : "border-hairline bg-subtle"}`}
    >
      <Icon icon={waiting ? ArrowRight : Clock} className={`mt-1 ${waiting ? "text-slate-fg" : "text-ink-secondary"}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 id="din-tur-heading" className="text-title-s">
          {/* Screen readers hear that this is the client's turn, not just the step name. */}
          {waiting && <span className="sr-only">{t.client.yourTurn.heading}: </span>}
          {title}
        </h2>
        <div className="text-body">{children}</div>
        {waiting && action && (
          <div className="mt-2">
            <ButtonLink href={action.href} variant="primary" aria-label={action.ariaLabel} className="w-full sm:w-auto">
              {action.label}
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}

