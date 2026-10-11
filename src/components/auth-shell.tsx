import Link from "next/link";
import type { ReactNode } from "react";
import { cardClass } from "@/components/ds/card";
import { t } from "@/i18n/nb";

// Login, verification and other pages outside the app shell: brand on the canvas, Title XL,
// then the content in one floating card.
export function AuthShell({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="px-4 py-6 md:px-8">
        <p className="text-title-s">{t.app.studioName}</p>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 md:items-center md:pt-0">
        <div className="flex w-full max-w-[480px] flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-title-xl">{title}</h1>
            {intro && <p className="text-body-l text-ink-secondary">{intro}</p>}
          </div>
          <div className={`flex flex-col gap-6 ${cardClass("card")}`}>{children}</div>
        </div>
      </main>
      <footer className="px-4 py-6 md:px-8">
        <Link href="/personvern" className="prose-link text-small text-ink-secondary">
          {t.common.privacy}
        </Link>
      </footer>
    </div>
  );
}
