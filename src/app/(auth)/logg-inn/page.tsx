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
    <AuthShell title={t.auth.login.title} intro={t.auth.login.intro}>
      <Suspense fallback={<LoginForm next="/" />}>
        <LoginFormWithNext searchParams={searchParams} />
      </Suspense>
      <Link href="/personvern" className="prose-link text-small text-ink-secondary">
        {t.auth.login.privacyLink}
      </Link>
    </AuthShell>
  );
}
