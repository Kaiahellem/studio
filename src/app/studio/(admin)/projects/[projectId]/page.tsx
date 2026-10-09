import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ActionButton, ActionForm, Checkbox, Field, Select, TextArea } from "@/components/form";
import { Badge, PageHeader, Section } from "@/components/ui";
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
import { getProjectForEditing } from "@/features/projects/queries";
import { stepTurn, toTurnStep } from "@/features/projects/turn";
import { formatDate } from "@/lib/format/date";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";
import { StepFields } from "./step-fields";

const p = t.studio.projects;
const labels = t.studio.labels;

export const metadata: Metadata = { title: p.phasesTitle };

type Editor = NonNullable<Awaited<ReturnType<typeof getProjectForEditing>>>;
type Phase = Editor["phases"][number];
type Step = Phase["project_steps"][number];

// Collapsible editing panel; <details> is keyboard and screen-reader friendly out of the box.
function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group mt-3">
      <summary className="cursor-pointer text-sm underline underline-offset-4 hover:no-underline">{summary}</summary>
      <div className="mt-4 rounded-md border border-line bg-surface p-4 sm:p-6">{children}</div>
    </details>
  );
}

function PhaseFields({ phase }: { phase?: Phase }) {
  return (
    <>
      <Field label={p.phaseName} name="name" required defaultValue={phase?.name ?? ""} />
      <TextArea label={p.phaseDescription} name="description" rows={2} defaultValue={phase?.description ?? ""} />
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
    <li className="py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={`font-medium ${finished ? "text-muted line-through decoration-1" : ""}`}>{step.title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={step.status === "active" ? "accent" : step.status === "done" ? "success" : "muted"}>
              {labels.stepStatus[step.status]}
            </Badge>
            {turn && <Badge>{labels.turn[turn]}</Badge>}
            <Badge>{labels.type[step.type]}</Badge>
            <Badge tone="muted">{labels.owner[step.owner]}</Badge>
            {!step.visible_to_client && <Badge tone="muted">{labels.hidden}</Badge>}
            {step.due_date && <Badge tone="muted">{p.due(formatDate(step.due_date))}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {step.status === "active" && (
            <>
              <ActionButton action={completeStepAction.bind(null, step.id, false)} label={p.markDone} />
              <ActionButton action={completeStepAction.bind(null, step.id, true)} label={p.skip} />
            </>
          )}
          {step.status === "pending" && <ActionButton action={completeStepAction.bind(null, step.id, true)} label={p.skip} />}
          {finished && <ActionButton action={reopenStepAction.bind(null, step.id)} label={p.reopen} />}
          {!isFirst && <ActionButton action={moveStepAction.bind(null, step.id, -1)} label="↑" ariaLabel={p.moveUp(step.title)} />}
          {!isLast && <ActionButton action={moveStepAction.bind(null, step.id, 1)} label="↓" ariaLabel={p.moveDown(step.title)} />}
          <ActionButton
            action={deleteStepAction.bind(null, step.id)}
            label={t.common.delete}
            ariaLabel={p.deleteStep(step.title)}
            confirm={p.confirmDeleteStep(step.title)}
            variant="danger"
          />
        </div>
      </div>
      <Disclosure summary={p.editStep(step.title)}>
        <ActionForm action={updateStepAction.bind(null, step.id)} submitLabel={p.saveStep} pendingLabel={t.common.loading}>
          <StepFields defaults={step} forms={forms} />
        </ActionForm>
      </Disclosure>
    </li>
  );
}

function PhaseSection({ phase, isFirst, isLast, forms }: { phase: Phase; isFirst: boolean; isLast: boolean; forms: Editor["forms"] }) {
  const headingId = `phase-${phase.id}`;
  return (
    <section aria-labelledby={headingId} className="mb-10 rounded-lg border border-line bg-surface/60 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id={headingId} className="font-serif text-2xl">
            <span className="text-muted">{phase.position}. </span>
            {phase.name}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={phase.status === "active" ? "accent" : phase.status === "done" ? "success" : "muted"}>
              {labels.phaseStatus[phase.status]}
            </Badge>
            <Badge tone="muted">{p.stepMode[phase.step_mode]}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isFirst && <ActionButton action={movePhaseAction.bind(null, phase.id, -1)} label="↑" ariaLabel={p.moveUp(phase.name)} />}
          {!isLast && <ActionButton action={movePhaseAction.bind(null, phase.id, 1)} label="↓" ariaLabel={p.moveDown(phase.name)} />}
          <ActionButton
            action={deletePhaseAction.bind(null, phase.id)}
            label={t.common.delete}
            ariaLabel={p.deletePhase(phase.name)}
            confirm={p.confirmDeletePhase(phase.name)}
            variant="danger"
          />
        </div>
      </div>

      <Disclosure summary={p.editPhase(phase.name)}>
        <ActionForm action={updatePhaseAction.bind(null, phase.id)} submitLabel={p.savePhase} pendingLabel={t.common.loading}>
          <PhaseFields phase={phase} />
        </ActionForm>
      </Disclosure>

      {phase.project_steps.length === 0 ? (
        <p className="mt-4 text-muted">{p.noSteps}</p>
      ) : (
        <ol className="mt-4 divide-y divide-line border-y border-line">
          {phase.project_steps.map((step, i) => (
            <StepItem key={step.id} step={step} isFirst={i === 0} isLast={i === phase.project_steps.length - 1} forms={forms} />
          ))}
        </ol>
      )}

      <Disclosure summary={p.addStep}>
        <ActionForm action={addStepAction.bind(null, phase.id)} submitLabel={p.addStep} pendingLabel={t.common.loading}>
          <StepFields forms={forms} />
        </ActionForm>
      </Disclosure>
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
    <>
      <PageHeader
        title={project.name}
        eyebrow={
          project.clients && (
            <Link href={`/studio/clients/${project.clients.id}`} className="underline underline-offset-4 hover:no-underline">
              {project.clients.name}
            </Link>
          )
        }
        actions={<Badge>{labels.projectStatus[project.status]}</Badge>}
      />

      <div className="grid gap-x-12 lg:grid-cols-[2fr_1fr]">
        <Section id="phases" title={p.phasesTitle}>
          {phases.map((phase, i) => (
            <PhaseSection key={phase.id} phase={phase} isFirst={i === 0} isLast={i === phases.length - 1} forms={forms} />
          ))}
          <Disclosure summary={p.addPhase}>
            <ActionForm action={addPhaseAction.bind(null, project.id)} submitLabel={p.addPhase} pendingLabel={t.common.loading}>
              <PhaseFields />
            </ActionForm>
          </Disclosure>
        </Section>

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
      </div>
    </>
  );
}
