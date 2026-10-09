import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/form";
import { getStepForClient } from "@/features/hub/queries";
import { displayAnswer, parseDefinition, type Answers } from "@/features/forms/schema";
import { stepTurn, toTurnStep } from "@/features/projects/turn";
import { completeClientStepAction, createUploadAction, registerUploadAction } from "@/features/steps/actions";
import { ApprovalPanel } from "@/features/steps/components/approval-panel";
import { CommentThread } from "@/features/steps/components/comments";
import { FileList } from "@/features/steps/components/file-list";
import { FormStep } from "@/features/steps/components/form-step";
import { UploadPanel } from "@/features/steps/components/upload-panel";
import { getUploadSettings } from "@/features/steps/settings";
import { formatDate } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const c = t.client;

export const metadata: Metadata = { title: c.yourTurn.heading };

type StepConfig = { url?: string; accept?: string[]; client_can_complete?: boolean } | null;

export default async function StepPage({ params }: PageProps<"/p/[projectId]/steg/[stepId]">) {
  const { projectId, stepId } = await params;
  if (!uuid.safeParse(projectId).success || !uuid.safeParse(stepId).success) notFound();
  const [{ step, files, comments, people }, uploadSettings] = await Promise.all([
    getStepForClient(projectId, stepId),
    getUploadSettings(),
  ]);

  const config = step.config as StepConfig;
  const active = step.status === "active";
  const turn = stepTurn(toTurnStep(step));
  const clientCanComplete = config?.client_can_complete !== false;

  const rounds = [...step.approval_rounds].sort((a, b) => b.round - a.round);
  const current = rounds[0];
  const openRound = current && !current.approvals ? current : null;
  const max = step.max_revision_rounds;

  const definition = step.form_definitions ? parseDefinition(step.form_definitions.schema) : null;
  const response = step.form_responses;
  const answers = (response?.answers ?? {}) as Answers;
  const link = config?.url && /^https?:\/\//i.test(config.url) ? config.url : null;

  return (
    <article className="flex flex-col gap-10">
      <Link href={`/p/${projectId}`} className="text-sm underline underline-offset-4 hover:no-underline">
        <span aria-hidden="true">← </span>
        {c.step.back}
      </Link>

      <header className="flex flex-col gap-4">
        {step.project_phases && <p className="text-muted">{c.step.phase(step.project_phases.name)}</p>}
        <h1 className="font-serif text-4xl leading-tight tracking-tight">{step.title}</h1>
        {step.description && <p className="max-w-prose text-lg leading-relaxed">{step.description}</p>}
        {active && step.due_date && <p className="text-sm font-medium">{c.yourTurn.dueBy(formatDate(step.due_date))}</p>}
        {step.status === "done" && step.completed_at && (
          <p className="text-sm font-medium text-success">
            <span aria-hidden="true">✓ </span>
            {c.step.completed(formatDate(step.completed_at))}
          </p>
        )}
        {step.status === "skipped" && <p className="text-muted">{c.step.skipped}</p>}
        {step.status === "pending" && <p className="text-muted">{c.step.notActive}</p>}
      </header>

      {/* Approval: the open round, or what happens next, plus the dated record. */}
      {step.type === "approval" && (
        <section aria-labelledby="approval-heading" className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <h2 id="approval-heading" className="font-serif text-2xl">
            {current ? c.step.round(current.round, max) : c.approval.history}
          </h2>
          {openRound && active ? (
            <>
              {openRound.note && <p className="whitespace-pre-line leading-relaxed">{openRound.note}</p>}
              {openRound.link && /^https?:\/\//i.test(openRound.link) && (
                <a href={openRound.link} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4 sm:self-start">
                  {c.step.openLink}
                  <span aria-hidden="true"> ↗</span>
                  <span className="sr-only"> {c.newTab}</span>
                </a>
              )}
              {max !== null && openRound.round === max && <p className="rounded-md bg-paper p-4 text-sm leading-relaxed">{c.approval.lastIncluded}</p>}
              {max !== null && openRound.round > max && <p className="rounded-md bg-paper p-4 text-sm leading-relaxed">{c.approval.extraRound}</p>}
              <ApprovalPanel stepId={step.id} />
            </>
          ) : (
            active && (
              // After asking for changes, the thanks stays until the next version is shared.
              <p role="status" className={current?.approvals?.decision === "changes_requested" ? "rounded-md bg-success-surface p-4 text-success" : "text-muted"}>
                {current?.approvals?.decision === "changes_requested" ? c.approval.changesThanks : c.approval.preparing}
              </p>
            )
          )}

          {rounds.some((r) => r.approvals) && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-muted">{c.approval.history}</h3>
              <ol className="flex flex-col gap-4">
                {rounds.map((r) => (
                  <li key={r.id} className="border-l-2 border-line pl-4 text-sm">
                    <p className="font-medium">{c.step.round(r.round, max)} · {c.approval.sharedOn(formatDate(r.opened_at))}</p>
                    {r.approvals && (
                      <>
                        <p className={r.approvals.decision === "approved" ? "text-success" : ""}>
                          {r.approvals.decision === "approved"
                            ? c.approval.approvedBy(formatDate(r.approvals.created_at), people(r.approvals.user_id).name)
                            : c.approval.changesBy(formatDate(r.approvals.created_at), people(r.approvals.user_id).name)}
                        </p>
                        {r.approvals.comment && <p className="mt-1 whitespace-pre-line text-muted">{r.approvals.comment}</p>}
                      </>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {/* Form: editable while active, a read-only summary once sent. */}
      {step.type === "form" && definition && (
        response?.status === "submitted" ? (
          <section aria-labelledby="answers-heading" className="flex flex-col gap-6">
            <h2 id="answers-heading" className="font-serif text-2xl">
              {response.submitted_at ? t.forms.submitted(formatDate(response.submitted_at)) : t.forms.submit}
            </h2>
            {definition.sections.map((section) => (
              <dl key={section.title} className="flex flex-col gap-3">
                <h3 className="font-medium">{section.title}</h3>
                {section.fields.map((field) => (
                  <div key={field.key} className="text-sm">
                    <dt className="text-muted">{field.label}</dt>
                    <dd className="whitespace-pre-line">{displayAnswer(field, answers[field.key]) ?? "–"}</dd>
                  </div>
                ))}
              </dl>
            ))}
          </section>
        ) : (
          active && <FormStep stepId={step.id} definition={definition} initial={answers} />
        )
      )}

      {/* Upload: add files, see what's delivered, say when done. */}
      {step.type === "upload" && (
        <section aria-labelledby="files-heading" className="flex flex-col gap-6">
          {active && (
            <UploadPanel
              create={createUploadAction.bind(null, projectId, step.id)}
              register={registerUploadAction.bind(null, step.id)}
              maxBytes={uploadSettings.maxBytes}
              allowedTypes={uploadSettings.allowedTypes}
              acceptHint={config?.accept}
            />
          )}
          <h2 id="files-heading" className="font-serif text-2xl">
            {c.upload.delivered}
          </h2>
          <FileList
            empty={c.upload.nothingYet}
            files={files.map((f) => ({
              ...f,
              uploader: people(f.uploaded_by).name,
              removable: active && people(f.uploaded_by).isYou,
            }))}
          />
          {active && (
            <div className="flex flex-col gap-2 border-t border-line pt-6">
              <p className="text-sm text-muted">{c.upload.doneHint}</p>
              <div>
                <ActionButton action={completeClientStepAction.bind(null, step.id)} label={c.upload.done} variant="primary" />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Link: open it. */}
      {step.type === "link" && link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center rounded-md border border-field-border bg-surface px-6 font-medium sm:self-start"
        >
          {c.step.openLink}
          <span aria-hidden="true">&nbsp;↗</span>
          <span className="sr-only"> {c.newTab}</span>
        </a>
      )}

      {/* Tasks and links the client finishes themselves. */}
      {(step.type === "task" || step.type === "link") && turn === "client" && (
        clientCanComplete ? (
          <div>
            <ActionButton action={completeClientStepAction.bind(null, step.id)} label={c.step.markDone} variant="primary" />
          </div>
        ) : (
          <p className="text-muted">{c.step.studioCompletes}</p>
        )
      )}
      {turn === "studio" && step.type !== "approval" && <p className="text-muted">{c.step.studioWorking}</p>}

      <CommentThread target={{ stepId: step.id }} comments={comments} />
    </article>
  );
}
