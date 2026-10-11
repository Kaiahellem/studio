import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { t } from "@/i18n/nb";
import "./globals.css";

// next/font self-hosts the files, so the browser never contacts Google (DESIGN.md, Typography).
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin", "latin-ext"], weight: ["500"] });

export const metadata: Metadata = {
  title: { default: t.app.name, template: `%s – ${t.app.name}` },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className={`${hanken.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh bg-canvas text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-2 focus:shadow-overlay"
        >
          {t.app.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
