import { getBundle } from "@/features/analysis/queries";

// The bundle as a .md file, for Claude Code or when it is too long to paste. Read through RLS,
// so anyone but an admin gets a 404.
export async function GET(_request: Request, { params }: RouteContext<"/studio/analyses/[analysisId]/runs/[runId]/bundle">) {
  const { runId } = await params;
  const bundle = await getBundle(runId);
  if (!bundle) return new Response("Not found", { status: 404 });
  const slug = bundle.businessName
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return new Response(bundle.text, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="analyse-${slug || "nettside"}.md"`,
      "cache-control": "private, no-store",
    },
  });
}
