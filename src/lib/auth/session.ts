import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string | null;
  aal: "aal1" | "aal2";
};

// Verified claims for the current request, or null when logged out. Cached per request,
// so guards can be called from layouts, pages and queries without repeating the work.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const claims = data.claims;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    aal: claims.aal === "aal2" ? "aal2" : "aal1",
  };
});

export const isAdminAccount = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin_account");
  if (error) throw error;
  return data === true;
});

export async function requireUser(next = "/"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/logg-inn?next=${encodeURIComponent(next)}`);
  return user;
}

// Admin pages: must be an admin account AND have completed TOTP (docs/PLAN.md §1.1).
// RLS enforces the same rule in the database; this check only routes the user.
export async function requireAdmin(next = "/studio"): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!(await isAdminAccount())) redirect("/");
  if (user.aal !== "aal2") redirect(`/studio/mfa?next=${encodeURIComponent(next)}`);
  return user;
}

// Where to send a user right after the email step.
export async function postLoginDestination(next: string): Promise<string> {
  if (!(await isAdminAccount())) return next.startsWith("/studio") ? "/" : next;

  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const hasVerifiedTotp = (data?.totp ?? []).some((f) => f.status === "verified");
  const target = next === "/" ? "/studio" : next;
  return hasVerifiedTotp
    ? `/studio/mfa?next=${encodeURIComponent(target)}`
    : `/studio/sikkerhet?next=${encodeURIComponent(target)}`;
}
