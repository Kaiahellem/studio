import type { ReactNode } from "react";
import { t } from "@/i18n/nb";
import { ButtonLink } from "./button";
import { cardClass } from "./card";
import { Tag } from "./tag";

// The most important element in Portal (DESIGN.md, "Din tur" card). Raised, with a slate
// "Din tur" tag and one primary button when something waits on the client; at Card level with
// a neutral tag and no button when it's my turn. Only one per page, first after the header.
export function DinTurCard({
  title,
  children,
  others,
  action,
  waiting = true,
  tag,
}: {
  title: string;
  children?: ReactNode;
  others?: ReactNode;
  action?: { label: string; href: string; ariaLabel?: string };
  waiting?: boolean;
  tag: string;
}) {
  return (
    <section aria-labelledby="din-tur-heading" className={`flex flex-col gap-3 ${cardClass(waiting ? "raised" : "card")}`}>
      <div>
        <Tag tone={waiting ? "slate" : "neutral"}>{tag}</Tag>
      </div>
      <h2 id="din-tur-heading" className="text-title-m">
        {/* Screen readers hear that this is the client's turn, not just the step name. */}
        {waiting && <span className="sr-only">{t.client.yourTurn.heading}: </span>}
        {title}
      </h2>
      {children && <div className="flex flex-col gap-2 text-body">{children}</div>}
      {others && <div className="text-small text-ink-secondary">{others}</div>}
      {waiting && action && (
        <div className="mt-2">
          <ButtonLink href={action.href} variant="primary" aria-label={action.ariaLabel} className="w-full sm:w-auto">
            {action.label}
          </ButtonLink>
        </div>
      )}
    </section>
  );
}
