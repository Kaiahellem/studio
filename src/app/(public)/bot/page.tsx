import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { t } from "@/i18n/nb";

export const metadata: Metadata = { title: t.bot.title };

// Linked from the crawler's user agent, so site owners can see who is reading their pages.
export default function BotPage() {
  return (
    <AuthShell title={t.bot.title}>
      <div className="flex flex-col gap-4">
        {t.bot.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </AuthShell>
  );
}
