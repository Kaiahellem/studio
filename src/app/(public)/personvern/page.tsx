import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { t } from "@/i18n/nb";

export const metadata: Metadata = { title: t.privacy.title };

// Placeholder; final text comes from the studio (BRIEF.md, Privacy).
export default function PrivacyPage() {
  return (
    <AuthShell title={t.privacy.title}>
      <div className="flex flex-col gap-4">
        <p className="text-body-l">{t.privacy.placeholder}</p>
        <p>{t.privacy.analysis}</p>
      </div>
    </AuthShell>
  );
}
