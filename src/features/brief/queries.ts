import "server-only";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/forms";
import type { TechnicalReport } from "@/features/analysis/bundle";
import { resultSchema } from "@/features/analysis/result";
import { displayAnswer, parseDefinition, type Answers } from "@/features/forms/schema";
import { readContent } from "@/features/handover/content";
import { t } from "@/i18n/nb";
import type { BriefData } from "./build";

const LINK_DAYS = 7;

// Collects the brief for one project. Admin only: a client could otherwise read their own
// project's brief through RLS, and it is meant for the studio. Internal notes and internal
// comments are left out.
export async function getBriefData(projectId: string): Promise<BriefData> {
  await requireAdmin(`/studio/projects/${projectId}`);
  if (!uuid.safeParse(projectId).success) notFound();
  const supabase = await createClient();

  const [project, steps, site, handover, files, documents, analyses] = await Promise.all([
    supabase.from("projects").select("*, clients(*)").eq("id", projectId).maybeSingle(),
    supabase
      .from("project_steps")
      .select(
        "id, title, type, position, project_phases(position), form_definitions(title, schema), form_responses(answers, status, submitted_at, definition_snapshot), approval_rounds(round, note, link, opened_at, approvals(decision, comment))",
      )
      .eq("project_id", projectId)
      .in("type", ["form", "approval"]),
    supabase.from("site_details").select("*").eq("project_id", projectId).maybeSingle(),
    supabase.from("handover_pages").select("handover_sections(kind, content)").eq("project_id", projectId).maybeSingle(),
    supabase.from("files").select("name, size_bytes, mime_type, storage_path, project_steps(title)").eq("project_id", projectId).is("change_request_id", null).order("created_at"),
    supabase.from("documents").select("type, title, status, document_date").eq("project_id", projectId).order("document_date"),
    supabase
      .from("site_analyses")
      .select("url, analysis_runs(status, started_at, result, technical)")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
  ]);
  for (const r of [project, steps, site, handover, files, documents, analyses]) if (r.error) throw r.error;
  if (!project.data || !project.data.clients) notFound();

  const ordered = [...steps.data!].sort((a, b) => (a.project_phases?.position ?? 0) - (b.project_phases?.position ?? 0) || a.position - b.position);

  const questionnaires: BriefData["questionnaires"] = ordered
    .filter((s) => s.type === "form" && s.form_definitions)
    .map((s) => {
      const response = s.form_responses;
      const definition = parseDefinition(response?.definition_snapshot ?? s.form_definitions!.schema);
      const answers = (response?.answers ?? {}) as Answers;
      return {
        title: s.form_definitions!.title,
        status: !response ? "missing" : response.status === "submitted" ? "submitted" : "draft",
        submittedAt: response?.submitted_at ?? null,
        sections: definition.sections.map((section) => ({
          title: section.title,
          fields: section.fields.map((f) => ({ key: f.key, label: f.label, answer: displayAnswer(f, answers[f.key]) })),
        })),
      };
    });

  const approvals: BriefData["approvals"] = ordered
    .filter((s) => s.type === "approval")
    .map((s) => ({
      step: s.title,
      rounds: [...s.approval_rounds]
        .sort((a, b) => a.round - b.round)
        .map((r) => ({ round: r.round, openedAt: r.opened_at, note: r.note, link: r.link, decision: r.approvals?.decision ?? null, comment: r.approvals?.comment ?? null })),
    }));

  const sections = handover.data?.handover_sections ?? [];
  const section = <K extends "colours" | "fonts" | "links_contacts">(kind: K) => readContent(kind, sections.find((x) => x.kind === kind)?.content);
  const linksContacts = section("links_contacts");

  const signed = files.data!.length
    ? (await supabase.storage.from("project-files").createSignedUrls(files.data!.map((f) => f.storage_path), LINK_DAYS * 24 * 60 * 60)).data ?? []
    : [];

  // The newest finished run of any analysis linked to the project.
  const runs = analyses.data!.flatMap((a) => a.analysis_runs.filter((r) => r.status === "done").map((r) => ({ url: a.url, ...r })));
  const latest = runs.sort((x, y) => y.started_at.localeCompare(x.started_at))[0];
  const parsed = latest ? resultSchema.safeParse(latest.result) : null;

  const p = project.data;
  const c = p.clients!;
  const party = (v: string | null) => (v === "client" || v === "studio" ? t.client.handover.party[v] : null);
  const sd = site.data;
  const siteFields = sd && {
    domain_name: sd.domain_name,
    registrar: sd.registrar,
    domain_owner: party(sd.domain_owner),
    domain_renewal_date: sd.domain_renewal_date,
    hosting_provider: sd.hosting_provider,
    hosting_owner: party(sd.hosting_owner),
    hosting_renewal_date: sd.hosting_renewal_date,
    dns_provider: sd.dns_provider,
    email_provider: sd.email_provider,
    access_notes: sd.access_notes,
    google_business_profile_url: sd.google_business_profile_url,
    analytics_notes: sd.analytics_notes,
  };

  return {
    generatedAt: new Date(),
    project: {
      name: p.name,
      status: t.studio.labels.projectStatus[p.status],
      startDate: p.start_date,
      targetLaunch: p.target_launch_date,
      stagingUrl: p.staging_url,
      liveUrl: p.live_url,
      cmsUrl: p.cms_url,
    },
    client: { name: c.name, orgNumber: c.org_number, email: c.contact_email, phone: c.contact_phone, address: c.address },
    questionnaires,
    site: siteFields,
    brand: { colours: section("colours").colours, fonts: section("fonts").fonts, links: linksContacts.links, contacts: linksContacts.contacts },
    approvals,
    analysis: latest && parsed?.success ? { url: latest.url, ranAt: latest.started_at, result: parsed.data, technical: (latest.technical as unknown as TechnicalReport) ?? null } : null,
    files: files.data!.map((f) => ({
      name: f.name,
      step: f.project_steps?.title ?? null,
      sizeBytes: f.size_bytes,
      mimeType: f.mime_type,
      url: signed.find((s) => s.path === f.storage_path)?.signedUrl ?? null,
    })),
    documents: documents.data!.map((d) => ({
      type: t.client.documents.type[d.type],
      title: d.title,
      status: t.client.documents.status[d.status],
      date: d.document_date,
    })),
    linkDays: LINK_DAYS,
  };
}
