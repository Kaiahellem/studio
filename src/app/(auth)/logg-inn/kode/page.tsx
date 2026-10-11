import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { safeNextPath } from "@/lib/auth/next-path";
import { t } from "@/i18n/nb";
import { CodeForm } from "./code-form";

export const metadata: Metadata = { title: t.auth.checkEmail.title };

async function CodeStep({ searchParams }: { searchParams: PageProps<"/logg-inn/kode">["searchParams"] }) {
  const email = (await cookies()).get("login_email")?.value;
  if (!email) redirect("/logg-inn");
  const next = safeNextPath((await searchParams).next);

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-body">{t.auth.checkEmail.body(email)}</p>
        <p className="text-ink-secondary">{t.auth.checkEmail.hint}</p>
      </div>
      <CodeForm next={next} />
      <Link href={`/logg-inn?next=${encodeURIComponent(next)}`} className="prose-link text-small text-ink-secondary">
        {t.auth.checkEmail.wrongEmail}
      </Link>
    </>
  );
}

export default function CodePage({ searchParams }: PageProps<"/logg-inn/kode">) {
  return (
    <AuthShell title={t.auth.checkEmail.title}>
      <Suspense fallback={<p className="text-ink-secondary">{t.common.loading}</p>}>
        <CodeStep searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
