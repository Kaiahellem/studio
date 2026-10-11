import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { isAdminAccount, requireUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: t.auth.mfa.title };

async function MfaStep({ searchParams }: { searchParams: PageProps<"/studio/mfa">["searchParams"] }) {
  const next = safeNextPath((await searchParams).next, "/studio");
  const user = await requireUser("/studio/mfa");
  if (!(await isAdminAccount())) redirect("/");
  if (user.aal === "aal2") redirect(next);

  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factors = (data?.totp ?? [])
    .filter((f) => f.status === "verified")
    .map((f) => ({ id: f.id, name: f.friendly_name ?? t.auth.mfa.factorLabel }));
  if (factors.length === 0) redirect(`/studio/sikkerhet?next=${encodeURIComponent(next)}`);

  return <MfaForm next={next} factors={factors} />;
}

export default function MfaPage({ searchParams }: PageProps<"/studio/mfa">) {
  return (
    <AuthShell title={t.auth.mfa.title} intro={t.auth.mfa.intro}>
      <Suspense fallback={<p className="text-ink-secondary">{t.common.loading}</p>}>
        <MfaStep searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
