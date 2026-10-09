import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Callout } from "@/components/ds/callout";
import { Card, cardClass } from "@/components/ds/card";
import { LinkChip } from "@/components/ds/link-chip";
import { PageHeader } from "@/components/ds/page-header";
import { ReviewRound } from "@/components/ds/review-round";
import { Tag, type Tone } from "@/components/ds/tag";
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
import { formatDate, formatWeek } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";

const c = t.client;
const sp = c.step.properties;

// The step's own name in the tab and in the mobile top bar.
export async function generateMetadata({ params }: PageProps<"/p/[projectId]/steg/[stepId]">): Promise<Metadata> {
  const { stepId } = await params;
  if (!uuid.safeParse(stepId).success) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("project_steps").select("title").eq("id", stepId).maybeSingle();
  return { title: data?.title ?? c.nav.overview };
}

type StepConfig = { url?: string; accept?: string[]; client_can_complete?: boolean } | null;

const safeUrl = (url: string | null | undefined) => (url && /^https?:\/\//i.test(url) ? url : null);

export default async function StepPage({ params }: PageProps<"/p/[projectId]/steg/[stepId]">) {
  const { projectId, stepId } = await params;
  if (!uuid.safeParse(projectId).success || !uuid.safeParse(stepId).success) notFound();
  const [{ step, files, comments, people }, uploadSettings] = await Promise.all([getStepForClient(projectId, stepId), getUploadSettings()]);

  const config = step.config as StepConfig;
  const active = step.status === "active";
  const turn = stepTurn(toTurnStep(step));
  const clientCanComplete = config?.client_can_complete !== false;
  const phaseName = step.project_phases?.name ?? "";

  const rounds = [...step.approval_rounds].sort((a, b) => b.round - a.round);
  const current = rounds[0];
  const openRound = current && !current.approvals ? current : null;
  const max = step.max_revision_rounds;

  const definition = step.form_definitions ? parseDefinition(step.form_definitions.schema) : null;
  const response = step.form_responses;
  const answers = (response?.answers ?? {}) as Answers;
  const link = safeUrl(config?.url);

  const [stateLabel, stateTone]: [string, Tone] =
    turn === "client"
      ? [c.step.state.yourTurn, "slate"]
      : turn === "studio"
        ? [c.step.state.ourTurn, "neutral"]
        : step.status === "done"
          ? [c.step.state.done, "sage"]
          : [c.step.state[step.status === "skipped" ? "skipped" : "pending"], "neutral"];

  return (
    <article className="flex flex-col gap-10">
      <PageHeader
        title={step.title}
        trail={[{ label: c.nav.overview, href: `/p/${projectId}` }]}
        propertiesLabel={sp.label}
        properties={[
          { label: sp.status, value: <Tag tone={stateTone}>{stateLabel}</Tag> },
          { label: sp.phase, value: phaseName },
          { label: sp.round, value: step.type === "approval" && current ? c.step.round(current.round, max) : null },
          { label: sp.due, value: active && step.due_date ? c.overview.dateWithWeek(formatDate(step.due_date), formatWeek(step.due_date)) : null },
          { label: sp.completed, value: step.status === "done" && step.completed_at ? formatDate(step.completed_at) : null },
        ]}
      />

      {/* What the step is about, and what to do. */}
      {step.type !== "approval" && step.type !== "form" && (
        <Card className="flex flex-col gap-4">
          {step.description && <p className="text-body-l">{step.description}</p>}

          {step.status === "skipped" && <Callout>{c.step.skipped}</Callout>}
          {step.status === "pending" && <Callout>{c.step.notActive}</Callout>}
          {turn === "studio" && <Callout>{c.step.studioWorking}</Callout>}

          {step.type === "link" && link && (
            <div>
              <LinkChip href={link} label={c.step.openLink} />
            </div>
          )}

          {step.type === "upload" && active && (
            <UploadPanel
              create={createUploadAction.bind(null, projectId, step.id)}
              register={registerUploadAction.bind(null, step.id)}
              maxBytes={uploadSettings.maxBytes}
              allowedTypes={uploadSettings.allowedTypes}
              acceptHint={config?.accept}
            />
          )}

          {(step.type === "task" || step.type === "link") && turn === "client" &&
            (clientCanComplete ? (
              <div className="mt-2">
                <ActionButton action={completeClientStepAction.bind(null, step.id)} label={c.step.markDone} variant="primary" />
              </div>
            ) : (
              <Callout>{c.step.studioCompletes}</Callout>
            ))}
        </Card>
      )}

      {/* Upload: what has been delivered so far, then "done". */}
      {step.type === "upload" && (
        <section aria-labelledby="files-heading" className="flex flex-col gap-4">
          <h2 id="files-heading" className="text-title-l">
            {c.upload.delivered}
          </h2>
          <FileList
            empty={c.upload.nothingYet}
            label={c.upload.delivered}
            files={files.map((f) => ({ ...f, uploader: people(f.uploaded_by).name, removable: active && people(f.uploaded_by).isYou }))}
          />
          {active && (
            <div className="flex flex-col gap-2">
              <p className="text-small text-ink-secondary">{c.upload.doneHint}</p>
              <div>
                <ActionButton action={completeClientStepAction.bind(null, step.id)} label={c.upload.done} variant="primary" />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Approval: the current round as a review card, earlier rounds below. */}
      {step.type === "approval" && (
        <>
          {step.description && <p className="text-body-l">{step.description}</p>}
          {current ? (
            <ReviewRound
              phase={phaseName}
              round={c.step.round(current.round, max)}
              roundTone={openRound ? "slate" : current.approvals?.decision === "approved" ? "sage" : "brick"}
              instructions={current.note}
              links={safeUrl(current.link) ? [{ label: c.step.openVersion, url: current.link! }] : []}
              notice={
                <>
                  {openRound && max !== null && openRound.round === max && <Callout tone="warning">{c.approval.lastIncluded}</Callout>}
                  {openRound && max !== null && openRound.round > max && <Callout tone="warning">{c.approval.extraRound}</Callout>}
                  {!openRound && active && current.approvals?.decision === "changes_requested" && (
                    <Callout tone="success" role="status">
                      {c.approval.changesThanks}
                    </Callout>
                  )}
                  {current.approvals && (
                    <Callout tone={current.approvals.decision === "approved" ? "success" : "neutral"}>
                      <p>
                        {current.approvals.decision === "approved"
                          ? c.approval.approvedBy(formatDate(current.approvals.created_at), people(current.approvals.user_id).name)
                          : c.approval.changesBy(formatDate(current.approvals.created_at), people(current.approvals.user_id).name)}
                      </p>
                      {current.approvals.comment && <p className="mt-1 whitespace-pre-line">{current.approvals.comment}</p>}
                    </Callout>
                  )}
                </>
              }
              footer={openRound && active ? <ApprovalPanel stepId={step.id} /> : undefined}
              earlier={rounds.slice(1).map((r) => ({
                id: r.id,
                label: c.step.round(r.round, max),
                shared: c.approval.sharedOn(formatDate(r.opened_at)),
                outcome: r.approvals ? c.step.roundDecision[r.approvals.decision] : undefined,
                outcomeTone: r.approvals?.decision === "approved" ? "sage" : "brick",
                note: r.note,
                comment: r.approvals?.comment,
              }))}
            />
          ) : (
            active && (
              <Card>
                <Callout>{c.approval.preparing}</Callout>
              </Card>
            )
          )}
        </>
      )}

      {/* Form: editable while active, a read-only summary once sent. */}
      {step.type === "form" && definition && (
        <>
          {step.description && <p className="text-body-l">{step.description}</p>}
          {response?.status === "submitted" ? (
            <section aria-labelledby="answers-heading" className="flex flex-col gap-4">
              <h2 id="answers-heading" className="text-title-l">
                {c.step.answers}
              </h2>
              {response.submitted_at && <p className="-mt-2 text-ink-secondary">{t.forms.submitted(formatDate(response.submitted_at))}</p>}
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
            </section>
          ) : active ? (
            <FormStep stepId={step.id} definition={definition} initial={answers} />
          ) : (
            <Card>
              <Callout>{c.step.notActive}</Callout>
            </Card>
          )}
        </>
      )}

      <CommentThread target={{ stepId: step.id }} comments={comments} />
    </article>
  );
}
