import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { t } from "@/i18n/nb";

export default function ClientLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/" className="font-serif text-xl">
            {t.app.studioName}
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-3xl px-4 py-6 text-sm text-muted sm:px-8">
        <Link href="/personvern" className="underline underline-offset-4 hover:no-underline">
          {t.common.privacy}
        </Link>
      </footer>
    </div>
  );
}
