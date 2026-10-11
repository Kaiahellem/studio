import type { Metadata } from "next";
import { getPublicHandover } from "@/features/handover/queries";
import { Card } from "@/components/ds/card";
import { HandoverView } from "@/features/handover/view";
import { t } from "@/i18n/nb";

const h = t.client.handover;

// The token is the secret: never send it to other sites through the Referer header.
export const metadata: Metadata = { title: h.heading, referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function PublicHandoverPage({ params }: PageProps<"/overlevering/[token]">) {
  const { token } = await params;
  const data = /^[A-Za-z0-9_-]{32,128}$/.test(token) ? await getPublicHandover(token) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="px-4 py-6 md:px-8">
        <p className="text-title-s">{t.app.studioName}</p>
      </header>
      <main id="main" className="mx-auto w-full max-w-[840px] flex-1 px-4 pb-16 pt-6 md:px-8">
        {data ? (
          <HandoverView data={data} />
        ) : (
          <div className="flex flex-col gap-6">
            <h1 className="text-title-xl">{h.heading}</h1>
            <Card>
              <p className="text-body">{h.notFound}</p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
