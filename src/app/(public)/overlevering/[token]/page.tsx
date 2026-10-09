import type { Metadata } from "next";
import { getPublicHandover } from "@/features/handover/queries";
import { HandoverView } from "@/features/handover/view";
import { t } from "@/i18n/nb";

const h = t.client.handover;

// The token is the secret: never send it to other sites through the Referer header.
export const metadata: Metadata = { title: h.heading, referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function PublicHandoverPage({ params }: PageProps<"/overlevering/[token]">) {
  const { token } = await params;
  const data = /^[A-Za-z0-9_-]{32,128}$/.test(token) ? await getPublicHandover(token) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 py-6 sm:px-8">
        <p className="font-serif text-xl">{t.app.studioName}</p>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6 sm:px-8">
        {data ? (
          <HandoverView data={data} />
        ) : (
          <div className="flex flex-col gap-6">
            <h1 className="font-serif text-4xl tracking-tight">{h.heading}</h1>
            <p className="max-w-prose text-lg leading-relaxed text-muted">{h.notFound}</p>
          </div>
        )}
      </main>
    </div>
  );
}
