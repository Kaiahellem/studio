import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddRow, EditDisclosure } from "@/components/ds/add-row";
import { buttonVariants } from "@/components/ds/button";
import { cardClass } from "@/components/ds/card";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Section } from "@/components/ds/section";
import { Tag, type Tone } from "@/components/ds/tag";
import { ActionButton, ActionForm, Checkbox, Field, Select, TextArea } from "@/components/form";
import {
  addPhaseAction,
  addStepAction,
  completeStepAction,
  deletePhaseAction,
  deleteStepAction,
  movePhaseAction,
  moveStepAction,
  reopenStepAction,
  updatePhaseAction,
  updateProjectAction,
  updateStepAction,
} from "@/features/projects/actions";
import { LinkedAnalyses } from "@/features/analysis/linked";
import { getProjectForEditing } from "@/features/projects/queries";
import { stepTurn, toTurnStep } from "@/features/projects/turn";
import { formatDate, formatDateShort, formatWeek } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";
import { StepFields } from "./step-fields";

const p = t.studio.projects;
const labels = t.studio.labels;

export const metadata: Metadata = { title: p.phasesTitle };

type Editor = NonNullable<Awaited<ReturnType<typeof getProjectForEditing>>>;
type Phase = Editor["phases"][number];
type Step = Phase["project_steps"][number];

const stepTone: Record<Step["status"], Tone> = { active: "slate", done: "sage", pending: "neutral", skipped: "neutral" };
const phaseTone: Record<Phase["status"], Tone> = { active: "slate", done: "sage", pending: "neutral" };
const projectTone: Record<Editor["project"]["status"], Tone> = { active: "slate", completed: "sage", paused: "amber", archived: "neutral" };

function PhaseFields({ phase }: { phase?: Phase }) {
  return (
    <>
      <Field label={p.phaseName} name="name" required defaultValue={phase?.name ?? ""} />
      <TextArea label={p.phaseDescription} name="description" rows={2} grow defaultValue={phase?.description ?? ""} />
      <Select
        label={p.stepModeLabel}
        name="step_mode"
        defaultValue={phase?.step_mode ?? "sequential"}
        options={(["sequential", "parallel"] as const).map((m) => ({ value: m, label: p.stepMode[m] }))}
      />
    </>
  );
}

function StepItem({ step, isFirst, isLast, forms }: { step: Step; isFirst: boolean; isLast: boolean; forms: Editor["forms"] }) {
  const turn = stepTurn(toTurnStep(step));
  const finished = step.status === "done" || step.status === "skipped";

  return (
    <InsetRow
      actions={
        <>
          {step.status === "active" && (
            <>
              <ActionButton action={completeStepAction.bind(null, step.id, false)} label={p.markDone} variant="secondary" />
              <ActionButton action={completeStepAction.bind(null, step.id, true)} label={p.skip} variant="ghost" />
            </>
          )}
          {step.status === "pending" && <ActionButton action={completeStepAction.bind(null, step.id, true)} label={p.skip} variant="ghost" />}
          {finished && <ActionButton action={reopenStepAction.bind(null, step.id)} label={p.reopen} variant="ghost" />}
          {!isFirst && <ActionButton action={moveStepAction.bind(null, step.id, -1)} label="↑" ariaLabel={p.moveUp(step.title)} variant="ghost" />}
          {!isLast && <ActionButton action={moveStepAction.bind(null, step.id, 1)} label="↓" ariaLabel={p.moveDown(step.title)} variant="ghost" />}
        </>
      }
    >
      <div className="flex flex-col gap-1.5 py-2">
        <p className={`font-medium ${finished ? "text-ink-secondary line-through decoration-1" : ""}`}>
          <Link href={`/studio/projects/${step.project_id}/steps/${step.id}`} className="underline-offset-3 hover:underline hover:decoration-focus">
            {step.title}
          </Link>
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Tag tone={stepTone[step.status]}>{labels.stepStatus[step.status]}</Tag>
          {turn && <Tag tone={turn === "client" ? "slate" : "amber"}>{labels.turn[turn]}</Tag>}
          <Tag>{labels.type[step.type]}</Tag>
          <Tag>{labels.owner[step.owner]}</Tag>
          {!step.visible_to_client && <Tag>{labels.hidden}</Tag>}
          {step.due_date && <Tag>{p.due(`${formatDateShort(step.due_date)}, ${formatWeek(step.due_date)}`)}</Tag>}
        </div>
        <EditDisclosure label={p.editStep(step.title)}>
          <ActionForm action={updateStepAction.bind(null, step.id)} submitLabel={p.saveStep} pendingLabel={t.common.loading}>
            <StepFields defaults={step} forms={forms} />
          </ActionForm>
          {/* Destructive and rare, so it lives with the edit form rather than in every row. */}
          <div className="mt-4">
            <ActionButton action={deleteStepAction.bind(null, step.id)} label={p.deleteStep(step.title)} confirm={p.confirmDeleteStep(step.title)} variant="destructive" />
          </div>
        </EditDisclosure>
      </div>
    </InsetRow>
  );
}

function StepList({ phase, forms }: { phase: Phase; forms: Editor["forms"] }) {
  return (
    <InsetGroupedList inCard={false} ordered label={phase.name}>
      {phase.project_steps.map((step, i) => (
        <StepItem key={step.id} step={step} isFirst={i === 0} isLast={i === phase.project_steps.length - 1} forms={forms} />
      ))}
    </InsetGroupedList>
  );
}

// Each phase is a card: heading, status, the steps as an inset grouped list, and "Legg til steg".
function PhaseCard({ phase, isFirst, isLast, forms }: { phase: Phase; isFirst: boolean; isLast: boolean; forms: Editor["forms"] }) {
  const headingId = `phase-${phase.id}`;
  return (
    <section aria-labelledby={headingId} className={`flex flex-col gap-2 py-4 ${cardClass("card", false)}`}>
      <div className="flex flex-col gap-2 px-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 id={headingId} className="text-title-m">
              <span className="text-ink-secondary">{phase.position}. </span>
              {phase.name}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <Tag tone={phaseTone[phase.status]}>{labels.phaseStatus[phase.status]}</Tag>
              <Tag>{p.stepMode[phase.step_mode]}</Tag>
            </div>
          </div>
          <div className="flex gap-1">
            {!isFirst && <ActionButton action={movePhaseAction.bind(null, phase.id, -1)} label="↑" ariaLabel={p.moveUp(phase.name)} variant="ghost" />}
            {!isLast && <ActionButton action={movePhaseAction.bind(null, phase.id, 1)} label="↓" ariaLabel={p.moveDown(phase.name)} variant="ghost" />}
          </div>
        </div>
        <EditDisclosure label={p.editPhase(phase.name)}>
          <ActionForm action={updatePhaseAction.bind(null, phase.id)} submitLabel={p.savePhase} pendingLabel={t.common.loading}>
            <PhaseFields phase={phase} />
          </ActionForm>
          <div className="mt-4">
            <ActionButton action={deletePhaseAction.bind(null, phase.id)} label={p.deletePhase(phase.name)} confirm={p.confirmDeletePhase(phase.name)} variant="destructive" />
          </div>
        </EditDisclosure>
      </div>

      {phase.project_steps.length === 0 ? (
        <p className="px-4 text-ink-secondary md:px-5">{p.noSteps}</p>
      ) : phase.status === "done" ? (
        // Finished phases fold away so the active work stays near the top.
        <details className="px-2">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-control px-2 text-small text-ink-secondary hover:bg-hover hover:text-ink md:min-h-9">
            {p.showSteps(phase.project_steps.length)}
          </summary>
          <div className="-mx-2">
            <StepList phase={phase} forms={forms} />
          </div>
        </details>
      ) : (
        <StepList phase={phase} forms={forms} />
      )}

      <div className="px-4 pt-2 md:px-5">
        <AddRow label={p.addStep}>
          <div className="rounded-inset bg-inset p-4">
            <ActionForm action={addStepAction.bind(null, phase.id)} submitLabel={p.addStep} pendingLabel={t.common.loading}>
              <StepFields forms={forms} />
            </ActionForm>
          </div>
        </AddRow>
      </div>
    </section>
  );
}

export default async function ProjectPage({ params }: PageProps<"/studio/projects/[projectId]">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const editor = await getProjectForEditing(projectId);
  if (!editor) notFound();
  const { project, phases, forms } = editor;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={project.name}
        trail={project.clients ? [{ label: project.clients.name, href: `/studio/clients/${project.clients.id}` }] : []}
        actions={
          <a href={`/studio/projects/${project.id}/brief`} download title={t.studio.brief.downloadHint} className={buttonVariants.secondary}>
            {t.studio.brief.download}
          </a>
        }
        properties={[
          { label: p.status, value: <Tag tone={projectTone[project.status]}>{labels.projectStatus[project.status]}</Tag> },
          { label: p.template, value: project.process_templates?.name },
          { label: p.startDate, value: project.start_date ? formatDate(project.start_date) : null },
          {
            label: p.targetLaunch,
            value: project.target_launch_date ? `${formatDate(project.target_launch_date)}, ${formatWeek(project.target_launch_date)}` : null,
          },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="phases" className="flex flex-col gap-4">
          <h2 id="phases" className="text-title-l">
            {p.phasesTitle}
          </h2>
          {phases.map((phase, i) => (
            <PhaseCard key={phase.id} phase={phase} isFirst={i === 0} isLast={i === phases.length - 1} forms={forms} />
          ))}
          <AddRow label={p.addPhase}>
            <div className={cardClass("card")}>
              <ActionForm action={addPhaseAction.bind(null, project.id)} submitLabel={p.addPhase} pendingLabel={t.common.loading}>
                <PhaseFields />
              </ActionForm>
            </div>
          </AddRow>
        </section>

        <div className="flex flex-col gap-10">
          <Section id="settings" title={p.settings}>
            <ActionForm action={updateProjectAction.bind(null, project.id)} submitLabel={p.save} pendingLabel={t.common.loading}>
              <Field label={p.name} name="name" required defaultValue={project.name} />
              <Select
                label={p.status}
                name="status"
                defaultValue={project.status}
                options={(["active", "paused", "completed", "archived"] as const).map((s) => ({ value: s, label: labels.projectStatus[s] }))}
              />
              <Field label={p.startDate} name="start_date" type="date" defaultValue={project.start_date ?? ""} />
              <Field label={p.targetLaunch} name="target_launch_date" type="date" defaultValue={project.target_launch_date ?? ""} />
              <Field label={p.stagingUrl} hint={p.urlHint} name="staging_url" type="url" defaultValue={project.staging_url ?? ""} />
              <Field label={p.liveUrl} hint={p.urlHint} name="live_url" type="url" defaultValue={project.live_url ?? ""} />
              <Field label={p.cmsUrl} hint={p.urlHint} name="cms_url" type="url" defaultValue={project.cms_url ?? ""} />
              <Checkbox label={p.remindersEnabled} name="reminders_enabled" defaultChecked={project.reminders_enabled} />
            </ActionForm>
          </Section>
          <LinkedAnalyses projectId={project.id} />
        </div>
      </div>
    </div>
  );
}
