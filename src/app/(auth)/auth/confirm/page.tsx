import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { FormMessage } from "@/components/form";
import { safeNextPath } from "@/lib/auth/next-path";
import { t } from "@/i18n/nb";
import { ConfirmForm } from "./confirm-form";

export const metadata: Metadata = { title: t.auth.confirm.title };

// GET only renders a button; the token is used by the POST (see confirmLoginLink).
async function Confirm({ searchParams }: { searchParams: PageProps<"/auth/confirm">["searchParams"] }) {
  const { token_hash: tokenHash, next } = await searchParams;
  if (typeof tokenHash !== "string" || tokenHash.length === 0) {
    return <FormMessage error={t.auth.confirm.invalidLink} />;
  }
  return <ConfirmForm tokenHash={tokenHash} next={safeNextPath(next)} />;
}

export default function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  return (
    <AuthShell title={t.auth.confirm.title}>
      <Suspense fallback={<p className="text-muted">{t.common.loading}</p>}>
        <Confirm searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
