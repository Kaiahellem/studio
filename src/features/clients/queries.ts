import "server-only";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function listClients() {
  await requireAdmin("/studio/clients");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, contact_email, projects(id, name, status)")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getClientDetails(clientId: string) {
  // Also guards the service-role lookup below.
  await requireAdmin(`/studio/clients/${clientId}`);
  const supabase = await createClient();
  const [client, notes, members, projects] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
    supabase.from("client_private").select("internal_notes").eq("client_id", clientId).maybeSingle(),
    supabase.from("client_members").select("user_id, created_at").eq("client_id", clientId).order("created_at"),
    supabase.from("projects").select("id, name, status, created_at").eq("client_id", clientId).order("created_at"),
  ]);
  for (const r of [client, notes, members, projects]) if (r.error) throw r.error;
  if (!client.data) return null;

  // Emails live in auth.users, which only the admin API can read.
  const userIds = (members.data ?? []).map((m) => m.user_id);
  const admin = createAdminClient();
  const [profiles, users] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
    Promise.all(userIds.map((id) => admin.auth.admin.getUserById(id))),
  ]);

  const memberList = userIds.map((id, i) => ({
    userId: id,
    email: users[i].data.user?.email ?? "",
    name: profiles.data?.find((p) => p.user_id === id)?.full_name ?? null,
  }));

  return {
    client: client.data,
    internalNotes: notes.data?.internal_notes ?? "",
    members: memberList,
    projects: projects.data ?? [],
  };
}
