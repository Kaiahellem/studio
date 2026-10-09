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
      <p className="mb-3 text-lg leading-relaxed">{t.auth.checkEmail.body(email)}</p>
      <p className="mb-8 leading-relaxed text-muted">{t.auth.checkEmail.hint}</p>
      <CodeForm next={next} />
      <p className="mt-10 text-sm">
        <Link
          href={`/logg-inn?next=${encodeURIComponent(next)}`}
          className="underline underline-offset-4 hover:no-underline"
        >
          {t.auth.checkEmail.wrongEmail}
        </Link>
      </p>
    </>
  );
}

export default function CodePage({ searchParams }: PageProps<"/logg-inn/kode">) {
  return (
    <AuthShell title={t.auth.checkEmail.title}>
      <Suspense fallback={<p className="text-muted">{t.common.loading}</p>}>
        <CodeStep searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
