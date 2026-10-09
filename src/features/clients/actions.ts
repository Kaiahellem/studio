"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { z } from "zod";
import type { FormState } from "@/components/form";
import { requireAdmin } from "@/lib/auth/session";
import { firstError, formObject, optionalText, requiredText, uuid } from "@/lib/forms";
import { publicEnv } from "@/lib/public-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";

const s = t.studio.clients;

const clientSchema = z.object({
  name: requiredText(s.nameRequired),
  org_number: optionalText(20),
  contact_email: optionalText(320),
  contact_phone: optionalText(50),
  address: optionalText(500),
  internal_notes: optionalText(20000),
});
const clientKeys = ["name", "org_number", "contact_email", "contact_phone", "address", "internal_notes"] as const;

export async function createClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = clientSchema.safeParse(formObject(formData, clientKeys));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { internal_notes, ...client } = parsed.data;

  const supabase = await createClient();
  const created = await supabase.from("clients").insert(client).select("id").single();
  if (created.error) return { error: t.studio.errors.generic };

  if (internal_notes) {
    await supabase.from("client_private").insert({ client_id: created.data.id, internal_notes });
  }
  redirect(`/studio/clients/${created.data.id}`);
}

export async function updateClientAction(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = uuid.parse(clientId);
  const parsed = clientSchema.safeParse(formObject(formData, clientKeys));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { internal_notes, ...client } = parsed.data;

  const supabase = await createClient();
  const [updated, notes] = await Promise.all([
    supabase.from("clients").update(client).eq("id", id),
    supabase.from("client_private").upsert({ client_id: id, internal_notes }),
  ]);
  if (updated.error || notes.error) return { error: t.studio.errors.generic };

  refresh();
  return { message: s.saved };
}

// Finds or creates the auth user. Uses the service role because user management is an
// admin API; the caller has already been checked with requireAdmin().
async function findOrCreateUser(email: string): Promise<string> {
  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.data.user) return created.data.user.id;
  if (created.error?.code !== "email_exists") throw created.error ?? new Error("createUser failed");

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < 200) throw new Error("user exists but was not found");
  }
}

const inviteSchema = z.object({
  email: z.email(s.invalidEmail).max(320).transform((v) => v.trim().toLowerCase()),
  full_name: optionalText(200),
});

export async function inviteMemberAction(clientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = uuid.parse(clientId);
  const parsed = inviteSchema.safeParse(formObject(formData, ["email", "full_name"]));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { email, full_name } = parsed.data;

  const userId = await findOrCreateUser(email);
  const supabase = await createClient();

  const member = await supabase.from("client_members").insert({ client_id: id, user_id: userId });
  if (member.error) {
    return { error: member.error.code === "23505" ? s.alreadyMember : t.studio.errors.generic };
  }
  if (full_name) {
    const existing = await supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
    if (!existing.data?.full_name) await supabase.from("profiles").upsert({ user_id: userId, full_name });
  }

  // The invitation is the normal login email (link + code). A cookie-less client is used so
  // the admin's own session is untouched. A nicer welcome email arrives with milestone 7.
  const mailer = createSupabaseJs(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const confirmUrl = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_SITE_URL);
  confirmUrl.searchParams.set("next", "/");
  await mailer.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: confirmUrl.toString() } });

  await supabase.from("activity_log").insert({
    client_id: id,
    actor_id: admin.id,
    event: "member.invited",
    entity_type: "user",
    entity_id: userId,
  });

  refresh();
  return { message: s.inviteSent(email) };
}

export async function removeMemberAction(clientId: string, userId: string): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_members")
    .delete()
    .eq("client_id", uuid.parse(clientId))
    .eq("user_id", uuid.parse(userId));
  if (error) return { error: t.studio.errors.generic };
  refresh();
  return undefined;
}
