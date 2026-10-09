import type { ReactNode } from "react";
import { t } from "@/i18n/nb";
import { cardClass } from "./card";
import { LinkChip } from "./link-chip";
import { Tag, type Tone } from "./tag";
import { ToggleRow } from "./toggle-row";

export type EarlierRound = { id: string; label: string; shared: string; outcome?: string; outcomeTone?: Tone; comment?: string | null; note?: string | null };

// One review round (DESIGN.md, Review round): a card with the phase label and round tag, my
// instructions in an --inset area, review links as chips, and the decision at the bottom,
// separated by space rather than a line. Earlier rounds below as collapsed toggle rows.
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
      <section aria-labelledby="review-round-heading" className={`flex flex-col gap-4 ${cardClass("card")}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="review-round-heading" className="text-title-m">
            {phase}
          </h2>
          <Tag tone={roundTone}>{round}</Tag>
        </div>
        {instructions && (
          <div className="rounded-inset bg-inset p-4">
            <h3 className="mb-1 text-label text-ink-secondary">{t.ds.reviewLookFor}</h3>
            <p className="whitespace-pre-line text-body">{instructions}</p>
          </div>
        )}
        {links.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {links.map((l) => (
              <li key={l.url}>
                <LinkChip href={l.url} label={l.label} />
              </li>
            ))}
          </ul>
        )}
        {notice}
        {footer && <div className="mt-4">{footer}</div>}
      </section>

      {earlier.length > 0 && (
        <section aria-labelledby="earlier-rounds-heading" className="flex flex-col gap-4">
          <h2 id="earlier-rounds-heading" className="text-title-l">
            {t.ds.earlierRounds}
          </h2>
          <ul className={cardClass("card", false)}>
            {earlier.map((r, i) => (
              <li key={r.id} className="relative px-2 py-1 first:pt-2 last:pb-2 md:px-3">
                <ToggleRow
                  summary={
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-small text-ink-secondary">{r.shared}</span>
                    </span>
                  }
                  trailing={r.outcome ? <Tag tone={r.outcomeTone}>{r.outcome}</Tag> : undefined}
                >
                  <div className="mb-2 ml-6 flex flex-col gap-2 rounded-inset bg-inset p-3 text-body">
                    {r.note && <p className="whitespace-pre-line text-ink-secondary">{r.note}</p>}
                    {r.comment && <p className="whitespace-pre-line">{r.comment}</p>}
                  </div>
                </ToggleRow>
                {i < earlier.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-9 right-0 h-px bg-separator md:left-10" />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
