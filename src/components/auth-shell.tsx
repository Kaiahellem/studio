import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "@/i18n/nb";

// Narrow, centred layout for login and verification screens.
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 py-6 sm:px-8">
        <p className="font-serif text-xl">{t.app.studioName}</p>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <h1 className="mb-6 font-serif text-4xl leading-tight tracking-tight">{title}</h1>
          {children}
        </div>
      </main>
      <footer className="px-4 py-6 text-sm text-muted sm:px-8">
        <Link href="/personvern" className="underline underline-offset-4 hover:no-underline">
          {t.common.privacy}
        </Link>
      </footer>
    </div>
  );
}
