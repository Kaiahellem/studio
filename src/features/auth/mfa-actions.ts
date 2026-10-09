"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdminAccount } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";

const codeSchema = z.string().trim().regex(/^\d{6}$/);

export type MfaState = { error?: string } | undefined;

export type EnrollState =
  | { step: "idle"; error?: string }
  | { step: "verify"; factorId: string; qrCode: string; secret: string; error?: string };

export async function verifyMfa(_prev: MfaState, formData: FormData): Promise<MfaState> {
  const code = codeSchema.safeParse(formData.get("code"));
  if (!code.success) return { error: t.auth.checkEmail.codeFormat };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = (factors?.totp ?? []).filter((f) => f.status === "verified");
  const requested = formData.get("factorId");
  const factor = verified.find((f) => f.id === requested) ?? verified[0];
  if (!factor) redirect("/studio/sikkerhet");

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.data });
  if (error) return { error: t.auth.mfa.invalidCode };

  redirect(safeNextPath(formData.get("next"), "/studio"));
}

// One action for both enrollment steps, so the factor from step 1 is the state for step 2.
// Enrolling is allowed at aal1 only while the admin has no verified factor; adding another
// later requires aal2 (Supabase Auth enforces this too).
export async function enrollTotp(prev: EnrollState, formData: FormData): Promise<EnrollState> {
  if (!(await isAdminAccount())) redirect("/");
  const supabase = await createClient();

  if (formData.get("intent") === "verify" && prev.step === "verify") {
    const code = codeSchema.safeParse(formData.get("code"));
    if (!code.success) return { ...prev, error: t.auth.checkEmail.codeFormat };

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: prev.factorId, code: code.data });
    if (error) return { ...prev, error: t.auth.mfa.invalidCode };

    redirect(safeNextPath(formData.get("next"), "/studio/sikkerhet?aktivert=1"));
  }

  const friendlyName = z.string().trim().min(1).max(60).catch("Autentiseringsapp").parse(formData.get("name"));

  // Drop abandoned, unverified attempts so they don't pile up.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName });
  if (error || !data) return { step: "idle", error: t.common.unexpectedError };

  const qr = data.totp.qr_code;
  return {
    step: "verify",
    factorId: data.id,
    qrCode: qr.startsWith("data:") ? qr : `data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`,
    secret: data.totp.secret,
  };
}
