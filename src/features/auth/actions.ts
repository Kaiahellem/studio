"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { postLoginDestination } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/next-path";
import { publicEnv } from "@/lib/public-env";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";

// The email is kept in a short-lived httpOnly cookie between the two login screens, so it
// never ends up in URLs, browser history or server logs.
const LOGIN_EMAIL_COOKIE = "login_email";

export type FormState = { error?: string; message?: string } | undefined;

const emailSchema = z.email().max(320).transform((v) => v.trim().toLowerCase());
const otpSchema = z.string().trim().regex(/^\d{6}$/);

async function sendLoginEmail(email: string, next: string): Promise<void> {
  const supabase = await createClient();
  const confirmUrl = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_SITE_URL);
  confirmUrl.searchParams.set("next", next);

  // Errors are deliberately not shown: "unknown email", "sign-ups disabled" and rate limits
  // must all look the same, or the form would reveal which addresses have an account.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: confirmUrl.toString() },
  });
  if (error && !["otp_disabled", "user_not_found", "signup_disabled", "over_email_send_rate_limit"].includes(error.code ?? "")) {
    console.error("signInWithOtp failed", error.code, error.status);
  }
}

export async function requestLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: t.auth.login.invalidEmail };
  const next = safeNextPath(formData.get("next"));

  await sendLoginEmail(email.data, next);

  (await cookies()).set(LOGIN_EMAIL_COOKIE, email.data, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  redirect(`/logg-inn/kode?next=${encodeURIComponent(next)}`);
}

export async function resendLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = (await cookies()).get(LOGIN_EMAIL_COOKIE)?.value;
  if (!email) redirect("/logg-inn");
  await sendLoginEmail(email, safeNextPath(formData.get("next")));
  return { message: t.auth.checkEmail.resent };
}

export async function verifyLoginCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const cookieStore = await cookies();
  const email = cookieStore.get(LOGIN_EMAIL_COOKIE)?.value;
  if (!email) redirect("/logg-inn");

  const token = otpSchema.safeParse(formData.get("code"));
  if (!token.success) return { error: t.auth.checkEmail.codeFormat };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: token.data, type: "email" });
  if (error) return { error: t.auth.checkEmail.invalidCode };

  cookieStore.delete(LOGIN_EMAIL_COOKIE);
  redirect(await postLoginDestination(safeNextPath(formData.get("next"))));
}

// The emailed link lands on a page with a button; only this POST uses the token, so link
// scanners that merely open the URL don't burn it (docs/PLAN.md §1.1).
export async function confirmLoginLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const tokenHash = z.string().min(10).max(512).safeParse(formData.get("token_hash"));
  if (!tokenHash.success) return { error: t.auth.confirm.invalidLink };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash.data, type: "email" });
  if (error) return { error: t.auth.confirm.invalidLink };

  (await cookies()).delete(LOGIN_EMAIL_COOKIE);
  redirect(await postLoginDestination(safeNextPath(formData.get("next"))));
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/logg-inn");
}
