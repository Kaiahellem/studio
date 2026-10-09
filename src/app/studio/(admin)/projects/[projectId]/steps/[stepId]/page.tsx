import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, ActionForm, Field, TextArea } from "@/components/form";
import { Badge, PageHeader, Section } from "@/components/ui";
import { displayAnswer, parseDefinition, type Answers } from "@/features/forms/schema";
import { completeStepAction } from "@/features/projects/actions";
import { stepTurn, toTurnStep } from "@/features/projects/turn";
import { openRoundAction } from "@/features/steps/admin-actions";
import { getStepForAdmin } from "@/features/steps/admin-queries";
import { CommentThread } from "@/features/steps/components/comments";
import { FileList } from "@/features/steps/components/file-list";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const s = t.studio.step;
const labels = t.studio.labels;
const ap = t.client.approval;

export const metadata: Metadata = { title: s.rounds };

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

  return (
    <>
      <PageHeader
        title={step.title}
        eyebrow={
          <Link href={`/studio/projects/${projectId}`} className="underline underline-offset-4 hover:no-underline">
            {step.project_phases?.projects?.clients?.name} · {step.project_phases?.name}
          </Link>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge tone={step.status === "active" ? "accent" : step.status === "done" ? "success" : "muted"}>{labels.stepStatus[step.status]}</Badge>
            {turn && <Badge>{labels.turn[turn]}</Badge>}
            <Badge>{labels.type[step.type]}</Badge>
            {!step.visible_to_client && <Badge tone="muted">{labels.hidden}</Badge>}
          </div>
        }
      />

      <div className="grid gap-x-12 lg:grid-cols-[3fr_2fr]">
        <div>
          {step.description && <p className="mb-10 max-w-prose leading-relaxed text-muted">{step.description}</p>}

          {step.type === "approval" && (
            <Section id="rounds" title={s.rounds}>
              {rounds.length === 0 ? (
                <p className="mb-6 text-muted">{s.noRounds}</p>
              ) : (
                <ol className="mb-8 flex flex-col gap-4">
                  {rounds.map((r) => (
                    <li key={r.id} className="border-l-2 border-line pl-4">
                      <p className="font-medium">
                        {t.client.step.round(r.round, step.max_revision_rounds)} · {ap.sharedOn(formatDate(r.opened_at))}
                      </p>
                      {r.note && <p className="mt-1 whitespace-pre-line text-sm">{r.note}</p>}
                      {r.link && /^https?:\/\//i.test(r.link) && (
                        <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4">
                          {r.link}
                        </a>
                      )}
                      {r.approvals ? (
                        <div className="mt-2 text-sm">
                          <p className={r.approvals.decision === "approved" ? "font-medium text-success" : "font-medium"}>
                            {r.approvals.decision === "approved"
                              ? ap.approvedBy(formatDateTime(r.approvals.created_at), names(r.approvals.user_id).name)
                              : ap.changesBy(formatDateTime(r.approvals.created_at), names(r.approvals.user_id).name)}
                          </p>
                          {r.approvals.comment && <p className="mt-1 whitespace-pre-line text-muted">{r.approvals.comment}</p>}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted">{s.roundWaiting(r.round)}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {step.status === "active" && !openRound && (
                <>
                  <h3 className="mb-4 font-serif text-xl">{s.openRound}</h3>
                  <ActionForm action={openRoundAction.bind(null, step.id)} submitLabel={s.openRound} pendingLabel={t.common.loading}>
                    <TextArea label={s.roundNote} name="note" rows={3} />
                    <Field label={s.roundLink} hint={t.studio.projects.urlHint} name="link" type="url" />
                  </ActionForm>
                </>
              )}
            </Section>
          )}

          {step.type === "form" && definition && (
            <Section id="answers" title={s.formResponse}>
              {!response ? (
                <p className="text-muted">{s.notSubmitted}</p>
              ) : (
                <>
                  {response.status === "draft" ? (
                    <p className="mb-6 rounded-md bg-paper p-3 text-sm">{s.draft}</p>
                  ) : (
                    response.submitted_at && <p className="mb-6 text-sm text-muted">{t.forms.submitted(formatDateTime(response.submitted_at))}</p>
                  )}
                  {definition.sections.map((section) => (
                    <div key={section.title} className="mb-8">
                      <h3 className="mb-3 font-medium">{section.title}</h3>
                      <dl className="flex flex-col gap-3">
                        {section.fields.map((field) => (
                          <div key={field.key} className="text-sm">
                            <dt className="text-muted">{field.label}</dt>
                            <dd className="whitespace-pre-line">{displayAnswer(field, answers[field.key]) ?? "–"}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </>
              )}
            </Section>
          )}

          {(step.type === "upload" || files.length > 0) && (
            <Section id="files" title={s.files}>
              <FileList files={files} empty={s.noFiles} />
            </Section>
          )}

          {step.status === "active" && (
            <div className="mb-12 flex flex-wrap gap-2">
              <ActionButton action={completeStepAction.bind(null, step.id, false)} label={t.studio.projects.markDone} />
              <ActionButton action={completeStepAction.bind(null, step.id, true)} label={t.studio.projects.skip} />
            </div>
          )}
        </div>

        <CommentThread target={{ stepId: step.id }} comments={comments} allowInternal />
      </div>
    </>
  );
}
