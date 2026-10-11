import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { FormMessage } from "@/components/form";
import { isAdminAccount, requireUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";
import { EnrollForm } from "./enroll-form";

export const metadata: Metadata = { title: t.auth.security.title };

async function Security({ searchParams }: { searchParams: PageProps<"/studio/sikkerhet">["searchParams"] }) {
  const params = await searchParams;
  const user = await requireUser("/studio/sikkerhet");
  if (!(await isAdminAccount())) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const verified = (data?.totp ?? []).filter((f) => f.status === "verified");

  // Once a factor exists, this page needs a verified session like every other admin page.
  if (verified.length > 0 && user.aal !== "aal2") {
    redirect(`/studio/mfa?next=${encodeURIComponent("/studio/sikkerhet")}`);
  }

  const next = safeNextPath(params.next, "/studio/sikkerhet?aktivert=1");

  return (
    <div className="flex flex-col gap-8">
      {params.aktivert === "1" && <FormMessage message={t.auth.security.enrolled} />}

      <section aria-labelledby="factors-heading" className="flex flex-col gap-3">
        <h2 id="factors-heading" className="text-title-m">
          {t.auth.security.factorsTitle}
        </h2>
        {verified.length === 0 ? (
          <p className="text-ink-secondary">{t.auth.security.noFactors}</p>
        ) : (
          <ul className="rounded-inset bg-inset">
            {verified.map((f, i) => (
              <li key={f.id} className="relative flex min-h-12 items-center px-4">
                {f.friendly_name ?? t.auth.mfa.factorLabel}
                {i < verified.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-4 right-0 h-px bg-separator" />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="enroll-heading" className="flex flex-col gap-4">
        <h2 id="enroll-heading" className="text-title-m">
          {verified.length === 0 ? t.auth.security.enrollTitle : t.auth.security.addAnother}
        </h2>
        <p className="text-small text-ink-secondary">{t.auth.security.recoveryNote}</p>
        <EnrollForm next={next} />
      </section>

      {verified.length > 0 && (
        <Link href="/studio" className="prose-link text-small text-ink-secondary">
          {t.common.back}
        </Link>
      )}
    </div>
  );
}

export default function SecurityPage({ searchParams }: PageProps<"/studio/sikkerhet">) {
  return (
    <AuthShell title={t.auth.security.title} intro={t.auth.security.intro}>
      <Suspense fallback={<p className="text-ink-secondary">{t.common.loading}</p>}>
        <Security searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
