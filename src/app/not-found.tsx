import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { t } from "@/i18n/nb";

export default function NotFound() {
  return (
    <AuthShell title={t.common.notFoundTitle}>
      <p className="mb-8 text-lg leading-relaxed text-muted">{t.common.notFoundBody}</p>
      <Link href="/" className="underline underline-offset-4 hover:no-underline">
        {t.common.toStart}
      </Link>
    </AuthShell>
  );
}
