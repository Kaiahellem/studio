import "server-only";
import { notFound } from "next/navigation";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/session";
import type { Database } from "@/lib/db/types";
import { publicEnv } from "@/lib/public-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { withDownloadUrls } from "@/features/hub/queries";
import { readContent, type SectionKind } from "./content";
import type { HandoverData } from "./view";

const siteColumns =
  "domain_name, registrar, domain_owner, domain_renewal_date, hosting_provider, hosting_owner, hosting_renewal_date, email_provider, dns_provider";

function logoFileIds(sections: { kind: string; content: unknown }[]): string[] {
  return sections.filter((s) => s.kind === "logos").flatMap((s) => readContent("logos", s.content).file_ids);
}

// Logged-in client (or admin). RLS only returns a published page and visible sections.
export async function getHandoverForProject(projectId: string): Promise<HandoverData | null> {
  const supabase = await createClient();
  const [project, page, site] = await Promise.all([
    supabase.from("projects").select("name, live_url, cms_url, clients(name)").eq("id", projectId).maybeSingle(),
    supabase
      .from("handover_pages")
      .select("id, handover_sections(kind, title, content, position, visible)")
      .eq("project_id", projectId)
      .not("published_at", "is", null)
      .maybeSingle(),
    supabase.from("site_details").select(siteColumns).eq("project_id", projectId).maybeSingle(),
  ]);
  if (!project.data || !page.data) return null;

  const sections = page.data.handover_sections.filter((s) => s.visible).sort((a, b) => a.position - b.position);
  const ids = logoFileIds(sections);
  const files = ids.length
    ? await supabase.from("files").select("id, name, mime_type, size_bytes, storage_path").in("id", ids)
    : { data: [] };

  return {
    clientName: project.data.clients?.name ?? "",
    projectName: project.data.name,
    liveUrl: project.data.live_url,
    cmsUrl: project.data.cms_url,
    sections: sections.map((s) => ({ kind: s.kind as SectionKind, title: s.title, content: s.content })),
    site: site.data,
    files: await withDownloadUrls(files.data ?? []),
  };
}

// Public link, no login. The database function returns data only for an enabled, published
// page; the service role then signs links for exactly the files that page lists.
export async function getPublicHandover(token: string): Promise<HandoverData | null> {
  const anon = createSupabaseJs<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.rpc("get_public_handover", { p_token: token });
  if (error || !data) return null;

  const result = data as {
    project: { name: string; client_name: string; live_url: string | null; cms_url: string | null };
    sections: { kind: SectionKind; title: string; content: unknown }[];
    site: HandoverData["site"];
    files: { id: string; name: string; mime_type: string; storage_path: string }[];
  };

  const signed = result.files.length
    ? await createAdminClient().storage.from("project-files").createSignedUrls(result.files.map((f) => f.storage_path), 60 * 10)
    : { data: [] };

  return {
    clientName: result.project.client_name,
    projectName: result.project.name,
    liveUrl: result.project.live_url,
    cmsUrl: result.project.cms_url,
    sections: result.sections,
    site: result.site,
    // Storage paths stay on the server; only names and short-lived links reach the page.
    files: result.files.map((f) => ({
      id: f.id,
      name: f.name,
      mime_type: f.mime_type,
      url: signed.data?.find((s) => s.path === f.storage_path)?.signedUrl ?? null,
    })),
  };
}

export async function getHandoverForAdmin(projectId: string) {
  await requireAdmin(`/studio/projects/${projectId}/handover`);
  const supabase = await createClient();
  const [project, page, files] = await Promise.all([
    supabase.from("projects").select("id, name, clients(name)").eq("id", projectId).maybeSingle(),
    supabase.from("handover_pages").select("*, handover_sections(*)").eq("project_id", projectId).maybeSingle(),
    supabase.from("files").select("id, name, mime_type, created_at, project_steps(title)").eq("project_id", projectId).order("created_at"),
  ]);
  if (!project.data) notFound();
  return {
    project: project.data,
    page: page.data ? { ...page.data, handover_sections: page.data.handover_sections.sort((a, b) => a.position - b.position) } : null,
    files: files.data ?? [],
  };
}

export async function getSiteForAdmin(projectId: string) {
  await requireAdmin(`/studio/projects/${projectId}/site`);
  const supabase = await createClient();
  const [project, site] = await Promise.all([
    supabase.from("projects").select("id, name, clients(name)").eq("id", projectId).maybeSingle(),
    supabase.from("site_details").select("*").eq("project_id", projectId).maybeSingle(),
  ]);
  if (!project.data) notFound();
  return { project: project.data, site: site.data };
}
