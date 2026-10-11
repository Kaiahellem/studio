import { AuthShell } from "@/components/auth-shell";
import { ButtonLink } from "@/components/ds/button";
import { t } from "@/i18n/nb";

export default function NotFound() {
  return (
    <AuthShell title={t.common.notFoundTitle}>
      <p className="text-body">{t.common.notFoundBody}</p>
      <div>
        <ButtonLink href="/" variant="secondary">
          {t.common.toStart}
        </ButtonLink>
      </div>
    </AuthShell>
  );
}
