import Link from "next/link";
import { stepTurn } from "@/features/projects/turn";
import { formatDate } from "@/lib/format/date";
import { t } from "@/i18n/nb";
import type { HubPhase, NextAction } from "./next-action";

const c = t.client;

const stepHref = (projectId: string, stepId: string) => `/p/${projectId}/steg/${stepId}`;

// The most important element in the app (BRIEF.md): one clear thing to do, or reassurance.
export function NextActionCard({ projectId, next }: { projectId: string; next: NextAction }) {
  if (next.kind === "client") {
    const { step, others } = next;
    return (
      <section aria-labelledby="din-tur" className="rounded-xl border-2 border-accent bg-surface p-6 sm:p-8">
        <h2 id="din-tur" className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-accent">
          {c.yourTurn.heading}
        </h2>
        <p className="mb-3 font-serif text-3xl leading-tight sm:text-4xl">{step.title}</p>
        {step.description && <p className="mb-4 max-w-prose leading-relaxed text-muted">{step.description}</p>}
        {step.due_date && <p className="mb-6 text-sm font-medium">{c.yourTurn.dueBy(formatDate(step.due_date))}</p>}
        <Link
          href={stepHref(projectId, step.id)}
          // Starts with the visible text (WCAG 2.5.3), then says which step.
          aria-label={`${c.yourTurn.action[step.type]}: ${step.title}`}
          className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-md bg-accent px-6 text-base font-medium text-accent-ink hover:opacity-90 sm:w-auto"
        >
          {c.yourTurn.action[step.type]}
        </Link>
        {others.length > 0 && (
          <div className="mt-8 border-t border-line pt-6">
            <p className="mb-3 text-sm text-muted">{c.yourTurn.more(others.length)}</p>
            <ul className="flex flex-col gap-2">
              {others.map((o) => (
                <li key={o.id}>
                  <Link href={stepHref(projectId, o.id)} className="underline underline-offset-4 hover:no-underline">
                    {o.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  if (next.kind === "done") {
    return (
      <section aria-labelledby="status-heading" className="rounded-xl border border-line bg-surface p-6 sm:p-8">
        <h2 id="status-heading" className="mb-3 font-serif text-3xl">
          {c.done.heading}
        </h2>
        <p className="leading-relaxed text-muted">{c.done.body}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="status-heading" className="rounded-xl border border-line bg-surface p-6 sm:p-8">
      <h2 id="status-heading" className="mb-4 font-serif text-3xl leading-tight">
        {c.studioTurn.heading}
      </h2>
      {next.working.length > 0 && (
        <>
          <p className="mb-2 text-muted">{c.studioTurn.working}</p>
          <ul className="mb-6 flex list-disc flex-col gap-1 pl-5">
            {next.working.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </>
      )}
      <p className="text-sm font-medium">
        {next.expectBy ? c.studioTurn.expectBy(formatDate(next.expectBy)) : c.studioTurn.noDate}
      </p>
    </section>
  );
}

const marker = {
  done: "bg-accent text-accent-ink border-accent",
  active: "bg-surface border-accent text-accent ring-4 ring-accent/15",
  pending: "bg-paper border-field-border text-muted",
} as const;

export function Timeline({ projectId, phases }: { projectId: string; phases: HubPhase[] }) {
  return (
    <section aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="mb-6 font-serif text-2xl">
        {c.timeline.heading}
      </h2>
      <ol className="relative">
        {phases.map((phase, i) => {
          const isLast = i === phases.length - 1;
          return (
            <li key={phase.id} aria-current={phase.status === "active" ? "step" : undefined} className="relative flex gap-4 pb-8">
              {!isLast && <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-line" />}
              <span
                aria-hidden="true"
                className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium ${marker[phase.status]}`}
              >
                {phase.status === "done" ? "✓" : phase.position}
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-xs uppercase tracking-[0.1em] text-muted">
                  {c.timeline.phaseOf(phase.position, phases.length)} · {c.timeline.status[phase.status]}
                </p>
                <p className={`mt-1 text-lg ${phase.status === "active" ? "font-semibold" : ""}`}>{phase.name}</p>
                {phase.status === "active" && (
                  <>
                    {phase.description && <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">{phase.description}</p>}
                    <ul className="mt-4 flex flex-col gap-2">
                      {phase.steps.map((step) => {
                        const turn = stepTurn(step);
                        const finished = step.status === "done" || step.status === "skipped";
                        return (
                          <li key={step.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                            <span aria-hidden="true" className="w-4 text-center">
                              {finished ? "✓" : turn === "client" ? "→" : "·"}
                            </span>
                            <Link
                              href={stepHref(projectId, step.id)}
                              className={`underline-offset-4 hover:underline ${finished ? "text-muted" : turn === "client" ? "font-medium" : ""}`}
                            >
                              {step.title}
                            </Link>
                            <span className="text-muted">
                              – {turn ? c.timeline.turn[turn] : c.timeline.stepStatus[step.status]}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
