import { NextResponse, type NextRequest } from "next/server";
import { buildClientExport } from "@/features/privacy/export";
import { getSessionUser, isAdminAccount } from "@/lib/auth/session";
import { safeFileName } from "@/lib/format/file";
import { todayInOslo } from "@/lib/format/date";
import { uuid } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

// GDPR export for one client: a zip with data.json and all files. Admin with TOTP only.
export async function GET(_request: NextRequest, { params }: RouteContext<"/api/export/[clientId]">) {
  const user = await getSessionUser();
  if (!user || user.aal !== "aal2" || !(await isAdminAccount())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { clientId } = await params;
  if (!uuid.safeParse(clientId).success) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { zip, clientName } = await buildClientExport(clientId);

  const db = await createClient();
  await db.from("activity_log").insert({ client_id: clientId, actor_id: user.id, event: "client.exported", entity_type: "client", entity_id: clientId });

  const filename = `${safeFileName(clientName)}-${todayInOslo()}.zip`;
  return new NextResponse(zip as BodyInit, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
