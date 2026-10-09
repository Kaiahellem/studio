import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { t } from "@/i18n/nb";

export const metadata: Metadata = { title: t.privacy.title };

// Placeholder; final text comes from the studio (BRIEF.md, Privacy).
export default function PrivacyPage() {
  return (
    <AuthShell title={t.privacy.title}>
      <p className="text-lg leading-relaxed text-muted">{t.privacy.placeholder}</p>
    </AuthShell>
  );
}
