import { buildBrief } from "@/features/brief/build";
import { getBriefData } from "@/features/brief/queries";

// "Last ned prosjektbrief": a Markdown file for Claude Code in the website's repo.
export async function GET(_request: Request, { params }: RouteContext<"/studio/projects/[projectId]/brief">) {
  const { projectId } = await params;
  const data = await getBriefData(projectId);
  const slug = data.client.name
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return new Response(buildBrief(data), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="prosjektbrief-${slug || "prosjekt"}.md"`,
      "cache-control": "private, no-store",
    },
  });
}
