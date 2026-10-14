import { ChevronRight } from "lucide-react";
import { cardClass } from "@/components/ds/card";
import { Icon } from "@/components/ds/icon";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { Tag, type Tone } from "@/components/ds/tag";
import { t } from "@/i18n/nb";
import { describeIssue, type BundlePage, type TechnicalReport } from "./bundle";
import type { AnalysisResult, Finding } from "./result";

const r = t.studio.analysis.result;
const tech = t.studio.analysis.technical;

const impactTone: Record<Finding["impact"], Tone> = { high: "brick", medium: "amber", low: "neutral" };

const shortUrl = (url: string) => {
  const u = new URL(url);
  return u.pathname === "/" ? u.hostname.replace(/^www\./, "") : decodeURIComponent(u.pathname);
};

function SourceLinks({ urls }: { urls: string[] }) {
  return (
    <p className="text-small text-ink-secondary">
      {r.sources}:{" "}
      {urls.map((url, i) => (
        <span key={url}>
          {i > 0 && ", "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="prose-link [overflow-wrap:anywhere]">
            {shortUrl(url)}
            <span className="sr-only"> {t.client.newTab}</span>
          </a>
        </span>
      ))}
    </p>
  );
}

export function FindingCard({ finding, headingLevel = 3 }: { finding: Finding; headingLevel?: 3 | 4 }) {
  const H = headingLevel === 3 ? "h3" : "h4";
  return (
    <li className={`flex flex-col gap-3 ${cardClass("card")}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <H className="min-w-0 text-title-s">{finding.title}</H>
        <Tag tone={impactTone[finding.impact]}>{r.impact[finding.impact]}</Tag>
      </div>
      <dl className="flex flex-col gap-3">
        {finding.clientSaid && (
          <div className="rounded-inset bg-inset p-3">
            <dt className="text-label text-ink-secondary">{r.clientSaid}</dt>
            <dd className="whitespace-pre-line">{finding.clientSaid}</dd>
          </div>
        )}
        <div>
          <dt className="text-label text-ink-secondary">{r.siteToday}</dt>
          <dd className="whitespace-pre-line">{finding.siteToday}</dd>
        </div>
        <div>
          <dt className="text-label text-ink-secondary">{r.recommendation}</dt>
          <dd className="whitespace-pre-line">{finding.recommendation}</dd>
        </div>
      </dl>
      <SourceLinks urls={finding.sourceUrls} />
    </li>
  );
}

export function ResultView({ result }: { result: AnalysisResult }) {
  return (
    <>
      <section aria-labelledby="summary" className="flex flex-col gap-3">
        <h2 id="summary" className="text-title-l">
          {r.summary}
        </h2>
        <p className="max-w-prose text-body-l">{result.summary}</p>
      </section>

      <section aria-labelledby="findings" className="flex flex-col gap-4">
        <h2 id="findings" className="flex items-baseline gap-2 text-title-l">
          {r.findings}
          <span className="text-mono text-ink-secondary">{result.findings.length}</span>
        </h2>
        {result.findings.length === 0 ? (
          <p className="text-ink-secondary">{r.noFindings}</p>
        ) : (
          <ol className="flex flex-col gap-4">
            {result.findings.map((f, i) => (
              <FindingCard key={`${i}-${f.title}`} finding={f} />
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="keep" className="flex flex-col gap-4">
        <h2 id="keep" className="text-title-l">
          {r.keep}
        </h2>
        {result.keep.length === 0 ? (
          <p className="text-ink-secondary">{r.noKeep}</p>
        ) : (
          <InsetGroupedList label={r.keep}>
            {result.keep.map((k, i) => (
              <InsetRow key={`${i}-${k.sourceUrl}`}>
                <div className="flex flex-col gap-1 py-2">
                  <p className="flex flex-wrap items-center gap-2">
                    <Tag>{r.keepKind[k.kind]}</Tag>
                    <span className="font-medium">{k.description}</span>
                  </p>
                  {k.excerpt && <p className="whitespace-pre-line text-ink-secondary">«{k.excerpt}»</p>}
                  <SourceLinks urls={[k.sourceUrl]} />
                </div>
              </InsetRow>
            ))}
          </InsetGroupedList>
        )}
      </section>

      {result.limitations.length > 0 && (
        <section aria-labelledby="limitations" className="flex flex-col gap-3">
          <h2 id="limitations" className="text-title-m">
            {r.limitations}
          </h2>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-ink-secondary marker:text-ink-disabled">
            {result.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  // Lighthouse bands: 90+ good, 50–89 needs work, under 50 poor. Shown as text as well as tone.
  const tone: Tone = value === null ? "neutral" : value >= 90 ? "sage" : value >= 50 ? "amber" : "brick";
  return (
    <div className="flex flex-col gap-1 rounded-inset bg-inset p-3">
      <dt className="text-small text-ink-secondary">{label}</dt>
      <dd>
        <Tag tone={tone}>{value === null ? "–" : `${value} / 100`}</Tag>
      </dd>
    </div>
  );
}

export function TechnicalView({ report }: { report: TechnicalReport }) {
  const pagesWithIssues = report.pages.filter((p) => p.issues.length > 0);
  return (
    <section aria-labelledby="technical" className="flex flex-col gap-4">
      <h2 id="technical" className="text-title-l">
        {tech.heading}
      </h2>

      <div className={`flex flex-col gap-3 ${cardClass("card")}`}>
        <h3 className="text-title-s">{tech.site}</h3>
        {report.site.length === 0 ? (
          <p className="text-ink-secondary">{tech.noIssues}</p>
        ) : (
          <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-ink-disabled">
            {report.site.map((i) => (
              <li key={i.code}>{describeIssue(i)}</li>
            ))}
          </ul>
        )}
      </div>

      <div className={`flex flex-col gap-4 ${cardClass("card")}`}>
        <h3 className="text-title-s">{tech.pagespeed}</h3>
        {report.pagespeedFailed && <p className="text-ink-secondary">{tech.pagespeedFailed}</p>}
        {report.pagespeed.map((ps) => (
          <div key={ps.url} className="flex flex-col gap-3">
            <p className="font-medium [overflow-wrap:anywhere]">{shortUrl(ps.url)}</p>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(tech.scores) as (keyof typeof tech.scores)[]).map((k) => (
                <Score key={k} label={tech.scores[k]} value={ps.scores[k]} />
              ))}
            </dl>
            <p className="text-small text-ink-secondary">
              {(Object.keys(tech.metrics) as (keyof typeof tech.metrics)[]).map((k) => `${tech.metrics[k]} ${ps.metrics[k] ?? "–"}`).join(" · ")}
            </p>
            {ps.issues.length > 0 && (
              <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-ink-disabled">
                {ps.issues.map((i) => (
                  <li key={i.id}>
                    {i.title}
                    {i.displayValue && <span className="text-ink-secondary"> ({i.displayValue})</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className={`flex flex-col gap-3 ${cardClass("card")}`}>
        <h3 className="text-title-s">{tech.perPage}</h3>
        {pagesWithIssues.length === 0 ? (
          <p className="text-ink-secondary">{tech.noIssues}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pagesWithIssues.map((p) => (
              <li key={p.url}>
                <p className="font-medium [overflow-wrap:anywhere]">{shortUrl(p.url)}</p>
                <p className="text-ink-secondary">{p.issues.map(describeIssue).join(" · ")}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function PagesRead({ pages, skipped }: { pages: BundlePage[]; skipped: TechnicalReport["skipped"] }) {
  return (
    <section aria-labelledby="pages-read" className="flex flex-col gap-3">
      <details className="group">
        <summary className="-mx-2 inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control px-2 hover:bg-hover md:min-h-9 [&::-webkit-details-marker]:hidden">
          <Icon icon={ChevronRight} className="text-ink-secondary transition-transform duration-[120ms] group-open:rotate-90" />
          <h2 id="pages-read" className="text-title-m">
            {r.pages(pages.length)}
          </h2>
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          <InsetGroupedList ordered label={r.pages(pages.length)}>
            {pages.map((p) => (
              <InsetRow key={p.url}>
                <div className="flex flex-col py-1">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-3 hover:underline hover:decoration-focus [overflow-wrap:anywhere]">
                    {p.title || shortUrl(p.url)}
                    <span className="sr-only"> {t.client.newTab}</span>
                  </a>
                  <span className="text-small text-ink-secondary [overflow-wrap:anywhere]">{shortUrl(p.url)}</span>
                </div>
              </InsetRow>
            ))}
          </InsetGroupedList>
          {skipped.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-title-s">{r.skipped(skipped.length)}</h3>
              <ul className="flex flex-col gap-1 text-ink-secondary">
                {skipped.map((s) => (
                  <li key={s.url} className="[overflow-wrap:anywhere]">
                    {shortUrl(s.url)} ({r.skipReason[s.reason]})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
