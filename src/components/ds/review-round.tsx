import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { t } from "@/i18n/nb";
import { Icon } from "./icon";
import { Tag, type Tone } from "./tag";
import { ToggleRow } from "./toggle-row";

export type EarlierRound = { id: string; label: string; shared: string; outcome?: string; outcomeTone?: Tone; comment?: string | null; note?: string | null };

// One review round (DESIGN.md, Review round): phase label and round tag in the header, my
// instructions, review links as chips, then the decision in a footer; earlier rounds below,
// collapsed, showing what was shown and what was answered.
export function ReviewRound({
  phase,
  round,
  roundTone = "slate",
  instructions,
  links = [],
  notice,
  footer,
  earlier = [],
}: {
  phase: string;
  round: string;
  roundTone?: Tone;
  instructions?: string | null;
  links?: { label: string; url: string }[];
  notice?: ReactNode;
  footer?: ReactNode;
  earlier?: EarlierRound[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="review-round-heading" className="rounded-sm border border-hairline bg-sheet">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
          <h2 id="review-round-heading" className="text-title-s">
            {phase}
          </h2>
          <Tag tone={roundTone}>{round}</Tag>
        </div>
        <div className="flex flex-col gap-4 px-4 py-4">
          {instructions && (
            <div>
              <h3 className="mb-1 text-label text-ink-secondary">{t.ds.reviewLookFor}</h3>
              <p className="whitespace-pre-line text-body">{instructions}</p>
            </div>
          )}
          {links.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {links.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-control-border px-3 text-label hover:bg-subtle md:min-h-8"
                  >
                    {l.label}
                    <Icon icon={ExternalLink} />
                    <span className="sr-only">{t.client.newTab}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {notice}
        </div>
        {footer && <div className="border-t border-hairline px-4 py-4">{footer}</div>}
      </section>

      {earlier.length > 0 && (
        <section aria-labelledby="earlier-rounds-heading">
          <h2 id="earlier-rounds-heading" className="mb-2 text-title-s">
            {t.ds.earlierRounds}
          </h2>
          <ul className="border-t border-hairline">
            {earlier.map((r) => (
              <li key={r.id} className="border-b border-hairline py-1">
                <ToggleRow
                  summary={
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-small text-ink-secondary">{r.shared}</span>
                    </span>
                  }
                  trailing={r.outcome ? <Tag tone={r.outcomeTone}>{r.outcome}</Tag> : undefined}
                >
                  <div className="flex flex-col gap-2 pb-3 text-body">
                    {r.note && <p className="whitespace-pre-line text-ink-secondary">{r.note}</p>}
                    {r.comment && <p className="whitespace-pre-line">{r.comment}</p>}
                  </div>
                </ToggleRow>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
