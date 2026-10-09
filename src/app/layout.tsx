import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { t } from "@/i18n/nb";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: t.app.name, template: `%s – ${t.app.name}` },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="min-h-dvh bg-paper text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-4 focus:py-2"
        >
          {t.app.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
