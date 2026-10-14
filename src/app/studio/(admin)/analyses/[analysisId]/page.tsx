import type { Metadata } from "next";
import Link from "next/link";
import { EditDisclosure } from "@/components/ds/add-row";
import { Callout } from "@/components/ds/callout";
import { cardClass } from "@/components/ds/card";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Section } from "@/components/ds/section";
import { Tag } from "@/components/ds/tag";
import { ActionButton, ActionForm, Select, TextArea } from "@/components/form";
import { deleteAnalysisAction, linkAction, rerunAction, updateNotesAction } from "@/features/analysis/actions";
import { estimateTokens, LARGE_BUNDLE_TOKENS } from "@/features/analysis/bundle";
import { ManualPanel, RefreshWhileWorking } from "@/features/analysis/client";
import { getAnalysis, getBundle, getLinkOptions, getRunPages } from "@/features/analysis/queries";
import { isWorking, statusTone } from "@/features/analysis/status";
import { FindingCard, PagesRead, ResultView, TechnicalView } from "@/features/analysis/view";
import { formatDateTime } from "@/lib/format/nb";
import { t } from "@/i18n/nb";

const a = t.studio.analysis;

export const metadata: Metadata = { title: a.heading };
// "Kjør på nytt" continues in the background after the response.
export const maxDuration = 300;

type Errors = typeof a.errors;

export default async function AnalysisPage({ params, searchParams }: PageProps<"/studio/analyses/[analysisId]">) {
  const [{ analysisId }, query] = await Promise.all([params, searchParams]);
  const [{ analysis, runs }, options] = await Promise.all([getAnalysis(analysisId), getLinkOptions()]);

  const selected = runs.find((r) => r.id === query.run) ?? runs[0] ?? null;
  const compareWith = typeof query.compare === "string" ? runs.find((r) => r.id === query.compare && r.id !== selected?.id) : undefined;
  const [pages, bundle] = await Promise.all([
    selected && (selected.status === "done" || selected.status === "awaiting_result") ? getRunPages(selected.id) : Promise.resolve([]),
    selected?.status === "awaiting_result" ? getBundle(selected.id) : Promise.resolve(null),
  ]);
  const previousDone = selected ? runs.find((r) => r.status === "done" && r.startedAt < selected.startedAt) : undefined;
  const base = `/studio/analyses/${analysis.id}`;
  const linked = analysis.projects ? `${analysis.clients?.name ?? ""} · ${analysis.projects.name}` : analysis.clients?.name;

  return (
    <div className="flex flex-col gap-10">
      {selected && isWorking(selected.status) && <RefreshWhileWorking />}
      <PageHeader
        title={analysis.business_name}
        trail={[{ label: a.heading, href: "/studio/analyses" }]}
        actions={
          !selected || !isWorking(selected.status) ? <ActionButton action={rerunAction.bind(null, analysis.id)} label={a.runs.rerun} variant="secondary" /> : undefined
        }
        properties={[
          {
            label: a.properties.url,
            value: (
              <a href={analysis.url} target="_blank" rel="noopener noreferrer" className="prose-link [overflow-wrap:anywhere]">
                {analysis.url.replace(/^https?:\/\//, "")}
                <span className="sr-only"> {t.client.newTab}</span>
              </a>
            ),
          },
          {
            label: a.properties.linked,
            value: linked ? (
              <Link href={analysis.projects ? `/studio/projects/${analysis.projects.id}` : `/studio/clients/${analysis.clients!.id}`} className="prose-link">
                {linked}
              </Link>
            ) : null,
          },
          { label: a.properties.lastRun, value: selected ? formatDateTime(selected.startedAt) : null },
          { label: a.properties.mode, value: selected ? a.mode[selected.mode] : null },
          { label: a.properties.pages, value: selected && selected.pagesRead > 0 ? String(selected.pagesRead) : null },
          { label: a.properties.version, value: selected?.promptVersion ? a.version(selected.promptVersion) : null },
        ]}
      />

      {selected && isWorking(selected.status) && (
        <section aria-labelledby="progress" className={`flex flex-col gap-2 ${cardClass("card")}`}>
          <h2 id="progress" className="text-title-m">
            {a.progress.heading}
          </h2>
          <p role="status">
            {selected.status === "crawling"
              ? a.progress.crawling(selected.pagesRead)
              : selected.status === "checking"
                ? a.progress.checking
                : selected.status === "analysing"
                  ? a.progress.analysing
                  : a.progress.queued}
          </p>
        </section>
      )}

      {selected?.status === "failed" && (
        <Callout tone="critical" role="alert">
          {a.errors[(selected.error ?? "unknown") as keyof Errors] ?? a.errors.unknown}
        </Callout>
      )}

      {selected?.status === "awaiting_result" && bundle && (
        <section aria-labelledby="manual" className={`flex flex-col gap-4 ${cardClass("card")}`}>
          <h2 id="manual" className="text-title-m">
            {a.manual.heading}
          </h2>
          <ManualPanel
            runId={selected.id}
            bundle={bundle.text}
            tokens={estimateTokens(bundle.text)}
            tooLarge={estimateTokens(bundle.text) > LARGE_BUNDLE_TOKENS}
            downloadHref={`${base}/runs/${selected.id}/bundle`}
          />
        </section>
      )}

      {compareWith?.result && selected?.result ? (
        <section aria-labelledby="compare" className="flex flex-col gap-4">
          <h2 id="compare" className="text-title-l">
            {a.runs.compareHeading}
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {[selected, compareWith].map((run) => (
              <section key={run.id} aria-label={a.runs.open(formatDateTime(run.startedAt))} className="flex flex-col gap-3">
                <h3 className="text-title-s">{a.runs.open(formatDateTime(run.startedAt))}</h3>
                <ol className="flex flex-col gap-3">
                  {run.result!.findings.map((f, i) => (
                    <FindingCard key={`${i}-${f.title}`} finding={f} headingLevel={4} />
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </section>
      ) : (
        selected?.status === "done" && selected.result && <ResultView result={selected.result} />
      )}

      {selected?.technical && (selected.status === "done" || selected.status === "awaiting_result") && <TechnicalView report={selected.technical} />}
      {selected?.technical && pages.length > 0 && <PagesRead pages={pages} skipped={selected.technical.skipped} />}

      <div className="grid gap-10 lg:grid-cols-2">
        <Section id="runs" title={a.runs.heading} card={false}>
          <InsetGroupedList label={a.runs.heading}>
            {runs.map((run) => (
              <InsetRow key={run.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                  <Link href={`${base}?run=${run.id}`} aria-current={run.id === selected?.id ? "true" : undefined} className="font-medium underline-offset-3 hover:underline hover:decoration-focus">
                    {a.runs.open(formatDateTime(run.startedAt))}
                    {run.id === selected?.id && <span className="sr-only"> ({a.runs.current})</span>}
                  </Link>
                  <Tag tone={statusTone[run.status]}>{a.status[run.status]}</Tag>
                </div>
              </InsetRow>
            ))}
          </InsetGroupedList>
          {selected?.status === "done" && previousDone && !compareWith && (
            <div>
              <Link href={`${base}?run=${selected.id}&compare=${previousDone.id}`} className="prose-link">
                {a.runs.compare}
              </Link>
            </div>
          )}
        </Section>

        <div className="flex flex-col gap-10">
          <Section id="notes" title={a.form.notes}>
            <EditDisclosure label={a.form.editNotes}>
              <ActionForm action={updateNotesAction.bind(null, analysis.id)} submitLabel={a.form.save} pendingLabel={t.common.loading}>
                <TextArea label={a.form.problems} hint={a.form.notesHint} name="stated_problems" rows={3} grow defaultValue={analysis.stated_problems ?? ""} />
                <TextArea label={a.form.goals} hint={a.form.notesHint} name="goals" rows={3} grow defaultValue={analysis.goals ?? ""} />
              </ActionForm>
            </EditDisclosure>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="text-label text-ink-secondary">{a.form.problems}</dt>
                <dd className="whitespace-pre-line">{analysis.stated_problems || "–"}</dd>
              </div>
              <div>
                <dt className="text-label text-ink-secondary">{a.form.goals}</dt>
                <dd className="whitespace-pre-line">{analysis.goals || "–"}</dd>
              </div>
            </dl>
          </Section>

          <Section id="link" title={a.link.heading} description={a.link.hint}>
            <ActionForm action={linkAction.bind(null, analysis.id)} submitLabel={a.link.save} pendingLabel={t.common.loading}>
              <Select
                label={a.link.client}
                name="client_id"
                defaultValue={analysis.client_id ?? ""}
                options={[{ value: "", label: a.link.none }, ...options.clients.map((c) => ({ value: c.id, label: c.name }))]}
              />
              <Select
                label={a.link.project}
                name="project_id"
                defaultValue={analysis.project_id ?? ""}
                options={[{ value: "", label: a.link.none }, ...options.projects.map((p) => ({ value: p.id, label: p.clients ? `${p.clients.name} · ${p.name}` : p.name }))]}
              />
            </ActionForm>
          </Section>

          <div>
            <ActionButton
              action={deleteAnalysisAction.bind(null, analysis.id)}
              label={a.delete}
              confirm={a.confirmDelete(analysis.business_name)}
              variant="destructive"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
