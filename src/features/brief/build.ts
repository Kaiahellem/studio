import { t } from "@/i18n/nb";
import { formatBytes } from "@/lib/format/file";
import { formatDate } from "@/lib/format/nb";
import { describeIssue, type TechnicalReport } from "@/features/analysis/bundle";
import type { AnalysisResult } from "@/features/analysis/result";

// The project brief: everything Portal knows that is needed to build the website, in one
// Markdown file for Claude Code (the nettside-mal template's CLAUDE.md says how to use it).
// Pure, so it is tested without a database.

const b = t.studio.brief;

export type BriefData = {
  generatedAt: Date;
  project: { name: string; status: string; startDate: string | null; targetLaunch: string | null; stagingUrl: string | null; liveUrl: string | null; cmsUrl: string | null };
  client: { name: string; orgNumber: string | null; email: string | null; phone: string | null; address: string | null };
  questionnaires: {
    title: string;
    status: "missing" | "draft" | "submitted";
    submittedAt: string | null;
    sections: { title: string; fields: { key: string; label: string; answer: string | null }[] }[];
  }[];
  site: Record<string, string | null> | null;
  brand: {
    colours: { name: string; hex: string }[];
    fonts: { name: string; url?: string; usage?: string }[];
    links: { label: string; url: string }[];
    contacts: { name: string; role?: string; contact?: string }[];
  };
  approvals: {
    step: string;
    rounds: { round: number; openedAt: string; note: string | null; link: string | null; decision: "approved" | "changes_requested" | null; comment: string | null }[];
  }[];
  analysis: { url: string; ranAt: string; result: AnalysisResult; technical: TechnicalReport | null } | null;
  files: { name: string; step: string | null; sizeBytes: number; mimeType: string; url: string | null }[];
  documents: { type: string; title: string; status: string; date: string }[];
  linkDays: number;
};

const siteLabels = t.studio.site as Record<string, unknown>;
const line = (label: string, value: string | null | undefined) => (value ? `- **${label}:** ${value}` : null);
const lines = (...items: (string | null | undefined | false)[]) => items.filter((x): x is string => typeof x === "string").join("\n");
// Answers can span lines; keep them inside their list item.
const indent = (text: string) => text.replace(/\n/g, "\n  ");

export function buildBrief(d: BriefData): string {
  const out: string[] = [];
  out.push(`# ${b.title(d.project.name)}`, "", `${b.generated(formatDate(d.generatedAt))} ${b.private}`);

  out.push(
    "",
    `## ${b.client}`,
    "",
    lines(
      line(b.name, d.client.name),
      line(b.orgNumber, d.client.orgNumber),
      line(b.email, d.client.email),
      line(b.phone, d.client.phone),
      line(b.address, d.client.address),
    ),
  );

  out.push(
    "",
    `## ${b.project}`,
    "",
    lines(
      line(b.name, d.project.name),
      line(b.status, d.project.status),
      line(b.start, d.project.startDate && formatDate(d.project.startDate)),
      line(b.launch, d.project.targetLaunch && formatDate(d.project.targetLaunch)),
      line(b.staging, d.project.stagingUrl),
      line(b.live, d.project.liveUrl),
      line(b.cms, d.project.cmsUrl),
    ),
  );

  out.push("", `## ${b.questionnaires}`);
  for (const q of d.questionnaires) {
    out.push("", `### ${q.title}`, "");
    if (q.status === "missing") {
      out.push(b.notSubmitted);
      continue;
    }
    out.push(q.status === "draft" ? b.draft : b.submitted(formatDate(q.submittedAt!)));
    for (const section of q.sections) {
      out.push("", `#### ${section.title}`, "", ...section.fields.map((f) => `- **${f.label}** ${indent(f.answer ?? b.noAnswer)}`));
    }
  }

  out.push("", `## ${b.site}`, "");
  const siteRows = d.site
    ? Object.entries(d.site)
        .filter(([, v]) => v)
        .map(([k, v]) => line(typeof siteLabels[k] === "string" ? (siteLabels[k] as string) : k, v))
    : [];
  out.push(siteRows.length ? lines(...siteRows) : b.noSite);

  out.push("", `## ${b.brand}`, "");
  const brand = d.brand;
  if (!brand.colours.length && !brand.fonts.length && !brand.links.length && !brand.contacts.length) out.push(b.noBrand);
  if (brand.colours.length) out.push(`### ${b.colours}`, "", ...brand.colours.map((c) => `- ${c.name}: \`${c.hex}\``), "");
  if (brand.fonts.length) out.push(`### ${b.fonts}`, "", ...brand.fonts.map((f) => `- ${f.name}${f.usage ? ` – ${f.usage}` : ""}${f.url ? ` (${f.url})` : ""}`), "");
  if (brand.links.length) out.push(`### ${b.links}`, "", ...brand.links.map((l) => `- [${l.label}](${l.url})`), "");
  if (brand.contacts.length) out.push(`### ${b.contacts}`, "", ...brand.contacts.map((c) => `- ${[c.name, c.role, c.contact].filter(Boolean).join(", ")}`), "");

  out.push("", `## ${b.approvals}`);
  if (d.approvals.length === 0) out.push("", b.noApprovals);
  for (const a of d.approvals) {
    out.push("", `### ${a.step}`);
    if (a.rounds.length === 0) out.push("", b.noApprovals);
    for (const r of a.rounds) {
      out.push(
        "",
        `#### ${b.round(r.round, formatDate(r.openedAt))}`,
        "",
        lines(
          r.note && indent(r.note),
          r.link && `- ${r.link}`,
          r.decision ? `- **${b.decision[r.decision]}**${r.comment ? `: ${indent(r.comment)}` : ""}` : `- ${b.waiting}`,
        ),
      );
    }
  }

  out.push("", `## ${b.analysis}`, "");
  if (!d.analysis) out.push(b.noAnalysis);
  else {
    const { result, technical } = d.analysis;
    out.push(`${d.analysis.url} · ${formatDate(d.analysis.ranAt)}`, "", result.summary, "", `### ${b.findings}`, "");
    for (const f of result.findings) {
      out.push(
        `- **${f.title}** (${t.studio.analysis.result.impact[f.impact]})`,
        ...(f.clientSaid ? [`  - ${t.studio.analysis.result.clientSaid}: ${f.clientSaid}`] : []),
        `  - ${t.studio.analysis.result.siteToday}: ${f.siteToday}`,
        `  - ${t.studio.analysis.result.recommendation}: ${f.recommendation}`,
      );
    }
    if (result.keep.length) {
      out.push("", `### ${b.keep}`, "", ...result.keep.map((k) => `- ${t.studio.analysis.result.keepKind[k.kind]}: ${k.description}${k.excerpt ? ` – «${k.excerpt}»` : ""} (${k.sourceUrl})`));
    }
    if (technical?.site.length) out.push("", `### ${b.technical}`, "", ...technical.site.map((i) => `- ${describeIssue(i)}`));
  }

  out.push("", `## ${b.files}`, "");
  if (d.files.length === 0) out.push(b.noFiles);
  else {
    out.push(b.filesNote(d.linkDays), "");
    for (const f of d.files) {
      const label = `${f.name} (${formatBytes(f.sizeBytes)}${f.step ? `, ${f.step}` : ""})`;
      out.push(f.url ? `- [${label}](${f.url})` : `- ${label}`);
    }
  }

  if (d.documents.length) {
    out.push("", `## ${b.documents}`, "", ...d.documents.map((doc) => `- ${doc.title} (${doc.type}, ${doc.status}, ${formatDate(doc.date)})`));
  }

  // Structured copy for the agent: facts it should copy exactly, not re-type from prose.
  const data = {
    client: d.client,
    project: d.project,
    brand: d.brand,
    site: d.site,
    // Per questionnaire, since two forms can use the same field key.
    answers: Object.fromEntries(d.questionnaires.map((q) => [q.title, Object.fromEntries(q.sections.flatMap((s) => s.fields.map((f) => [f.key, f.answer])))])),
    keep: d.analysis?.result.keep ?? [],
    files: d.files.map((f) => ({ name: f.name, step: f.step, mimeType: f.mimeType, url: f.url })),
  };
  out.push("", `## ${b.forAgent}`, "", b.agentNote, "", "```json", JSON.stringify(data, null, 2), "```", "");
  return out.join("\n");
}
