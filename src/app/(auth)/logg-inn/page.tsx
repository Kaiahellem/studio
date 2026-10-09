import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { safeNextPath } from "@/lib/auth/next-path";
import { t } from "@/i18n/nb";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: t.auth.login.title };

async function LoginFormWithNext({ searchParams }: { searchParams: PageProps<"/logg-inn">["searchParams"] }) {
  const { next } = await searchParams;
  return <LoginForm next={safeNextPath(next)} />;
}

export default function LoginPage({ searchParams }: PageProps<"/logg-inn">) {
  return (
    <AuthShell title={t.auth.login.title}>
      <p className="mb-8 text-lg leading-relaxed text-muted">{t.auth.login.intro}</p>
      <Suspense fallback={<LoginForm next="/" />}>
        <LoginFormWithNext searchParams={searchParams} />
      </Suspense>
      <p className="mt-10 text-sm">
        <Link href="/personvern" className="underline underline-offset-4 hover:no-underline">
          {t.auth.login.privacyLink}
        </Link>
      </p>
    </AuthShell>
  );
}
