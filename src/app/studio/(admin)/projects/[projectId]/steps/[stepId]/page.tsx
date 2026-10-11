import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddRow } from "@/components/ds/add-row";
import { Card, cardClass } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { LinkChip } from "@/components/ds/link-chip";
import { PageHeader } from "@/components/ds/page-header";
import { Section } from "@/components/ds/section";
import { Tag, type Tone } from "@/components/ds/tag";
import { ActionButton, ActionForm, Field, TextArea } from "@/components/form";
import { displayAnswer, parseDefinition, type Answers } from "@/features/forms/schema";
import { completeStepAction } from "@/features/projects/actions";
import { stepTurn, toTurnStep } from "@/features/projects/turn";
import { openRoundAction } from "@/features/steps/admin-actions";
import { getStepForAdmin } from "@/features/steps/admin-queries";
import { CommentThread } from "@/features/steps/components/comments";
import { FileList } from "@/features/steps/components/file-list";
import { formatDate, formatDateTime } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const s = t.studio.step;
const labels = t.studio.labels;
const ap = t.client.approval;

export const metadata: Metadata = { title: s.rounds };

const stepTone: Record<string, Tone> = { active: "slate", done: "sage", pending: "neutral", skipped: "neutral" };

export default async function AdminStepPage({ params }: PageProps<"/studio/projects/[projectId]/steps/[stepId]">) {
  const { projectId, stepId } = await params;
  if (!uuid.safeParse(projectId).success || !uuid.safeParse(stepId).success) notFound();
  const { step, files, comments, names } = await getStepForAdmin(projectId, stepId);

  const turn = stepTurn(toTurnStep(step));
  const rounds = [...step.approval_rounds].sort((a, b) => b.round - a.round);
  const openRound = rounds[0] && !rounds[0].approvals ? rounds[0] : null;
  const response = step.form_responses;
  // Show answers against the questions as they were when submitted.
  const definitionSource = response?.definition_snapshot ?? step.form_definitions?.schema;
  const definition = definitionSource ? parseDefinition(definitionSource) : null;
  const answers = (response?.answers ?? {}) as Answers;
  const project = step.project_phases?.projects;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={step.title}
        trail={[{ label: project?.name ?? t.studio.projectNav.steps, href: `/studio/projects/${projectId}` }]}
        eyebrow={project?.clients?.name}
        actions={
          step.status === "active" ? (
            <>
              <ActionButton action={completeStepAction.bind(null, step.id, false)} label={t.studio.projects.markDone} variant="primary" />
              <ActionButton action={completeStepAction.bind(null, step.id, true)} label={t.studio.projects.skip} variant="secondary" />
            </>
          ) : undefined
        }
        properties={[
          { label: t.client.step.properties.phase, value: step.project_phases?.name },
          { label: t.client.step.properties.status, value: <Tag tone={stepTone[step.status]}>{labels.stepStatus[step.status]}</Tag> },
          { label: s.turnLabel, value: turn ? <Tag tone={turn === "client" ? "slate" : "amber"}>{labels.turn[turn]}</Tag> : null },
          { label: t.studio.projects.stepType, value: labels.type[step.type] },
          { label: t.client.step.properties.due, value: step.due_date ? formatDate(step.due_date) : null },
          { label: s.visibilityLabel, value: step.visible_to_client ? s.visible : labels.hidden },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="flex min-w-0 flex-col gap-10">
          {step.description && <p className="max-w-prose whitespace-pre-line text-body-l text-ink-secondary">{step.description}</p>}

          {step.type === "approval" && (
            <Section id="rounds" title={s.rounds} card={false}>
              {rounds.length === 0 && (
                <Card>
                  <EmptyState>{s.noRounds}</EmptyState>
                </Card>
              )}
              {rounds.length > 0 && (
                <ol className="flex flex-col gap-4">
                  {rounds.map((r) => {
                    const decided = r.approvals;
                    return (
                      <li key={r.id} className={`flex flex-col gap-3 ${cardClass("card")}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-title-s">{t.client.step.round(r.round, step.max_revision_rounds)}</h3>
                          <Tag tone={!decided ? "amber" : decided.decision === "approved" ? "sage" : "slate"}>
                            {!decided ? s.waiting : t.client.step.roundDecision[decided.decision]}
                          </Tag>
                        </div>
                        <p className="text-small text-ink-secondary">{ap.sharedOn(formatDate(r.opened_at))}</p>
                        {r.note && <p className="whitespace-pre-line rounded-inset bg-inset p-4">{r.note}</p>}
                        {r.link && /^https?:\/\//i.test(r.link) && (
                          <div>
                            <LinkChip href={r.link} label={t.client.step.openVersion} />
                          </div>
                        )}
                        {decided ? (
                          <div className="flex flex-col gap-1">
                            <p className="font-medium">
                              {decided.decision === "approved"
                                ? ap.approvedBy(formatDateTime(decided.created_at), names(decided.user_id).name)
                                : ap.changesBy(formatDateTime(decided.created_at), names(decided.user_id).name)}
                            </p>
                            {decided.comment && <p className="whitespace-pre-line text-ink-secondary">{decided.comment}</p>}
                          </div>
                        ) : (
                          <p className="text-ink-secondary">{s.roundWaiting(r.round)}</p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              {step.status === "active" && !openRound && (
                <AddRow label={s.openRound}>
                  <div className={cardClass("card")}>
                    <ActionForm action={openRoundAction.bind(null, step.id)} submitLabel={s.openRound} pendingLabel={t.common.loading}>
                      <TextArea label={s.roundNote} name="note" rows={3} grow />
                      <Field label={s.roundLink} hint={t.studio.projects.urlHint} name="link" type="url" />
                    </ActionForm>
                  </div>
                </AddRow>
              )}
            </Section>
          )}

          {step.type === "form" && definition && (
            <Section id="answers" title={s.formResponse} card={false}>
              {!response ? (
                <Card>
                  <EmptyState>{s.notSubmitted}</EmptyState>
                </Card>
              ) : (
                <>
                  {response.status === "draft" ? (
                    <p className="text-ink-secondary">{s.draft}</p>
                  ) : (
                    response.submitted_at && <p className="text-ink-secondary">{t.forms.submitted(formatDateTime(response.submitted_at))}</p>
                  )}
                  {definition.sections.map((section) => (
                    <section key={section.title} aria-label={section.title} className={cardClass("card", false)}>
                      <h3 className="px-4 pb-1 pt-4 text-title-s md:px-5 md:pt-5">{section.title}</h3>
                      <dl>
                        {section.fields.map((field, i) => (
                          <div key={field.key} className="relative flex flex-col gap-0.5 px-4 py-3 md:px-5">
                            <dt className="text-small text-ink-secondary">{field.label}</dt>
                            <dd className="whitespace-pre-line text-body">{displayAnswer(field, answers[field.key]) ?? "–"}</dd>
                            {i < section.fields.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-4 right-0 h-px bg-separator md:left-5" />}
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </>
              )}
            </Section>
          )}

          {(step.type === "upload" || files.length > 0) && (
            <Section id="files" title={s.files} card={false}>
              <FileList files={files} empty={s.noFiles} />
            </Section>
          )}
        </div>

        <CommentThread target={{ stepId: step.id }} comments={comments} allowInternal />
      </div>
    </div>
  );
}
