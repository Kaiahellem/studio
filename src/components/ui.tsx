import type { ReactNode } from "react";

// Shared classes, so buttons and links look the same wherever they are used.
export const buttonClass = {
  primary:
    "inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-70",
  secondary:
    "inline-flex h-11 items-center justify-center rounded-md border border-field-border bg-surface px-5 text-sm font-medium text-ink hover:bg-paper disabled:opacity-70",
  small:
    "inline-flex h-9 items-center justify-center rounded-md border border-field-border bg-surface px-3 text-sm text-ink hover:bg-paper disabled:opacity-70",
  danger:
    "inline-flex h-9 items-center justify-center rounded-md border border-danger bg-surface px-3 text-sm text-danger hover:bg-danger-surface disabled:opacity-70",
  link: "text-sm underline underline-offset-4 hover:no-underline",
} as const;

type Tone = "neutral" | "accent" | "success" | "danger" | "muted";

const toneClass: Record<Tone, string> = {
  neutral: "border-field-border text-ink",
  accent: "border-accent bg-accent text-accent-ink",
  success: "border-success text-success",
  danger: "border-danger text-danger",
  muted: "border-line text-muted",
};

// Status label. Always text, never colour alone.
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, eyebrow, actions }: { title: string; eyebrow?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 text-sm text-muted">{eyebrow}</p>}
        <h1 className="font-serif text-4xl leading-tight tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function Section({ title, id, children, actions }: { title: string; id: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-2">
        <h2 id={id} className="font-serif text-2xl">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted">{children}</p>;
}
