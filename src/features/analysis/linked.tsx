import Link from "next/link";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { Section } from "@/components/ds/section";
import { t } from "@/i18n/nb";
import { getLinkedAnalyses } from "./queries";

const a = t.studio.analysis;

// Admin pages only: analyses linked to this client or project. Nothing when there are none.
export async function LinkedAnalyses(filter: { clientId?: string; projectId?: string }) {
  const analyses = await getLinkedAnalyses(filter);
  if (analyses.length === 0) return null;
  return (
    <Section id="analyses" title={a.heading} card={false}>
      <InsetGroupedList label={a.heading}>
        {analyses.map((item) => (
          <InsetRow key={item.id}>
            <Link href={`/studio/analyses/${item.id}`} className="flex flex-col py-1">
              <span className="font-medium">{item.business_name}</span>
              <span className="text-small text-ink-secondary [overflow-wrap:anywhere]">{item.url.replace(/^https?:\/\//, "")}</span>
            </Link>
          </InsetRow>
        ))}
      </InsetGroupedList>
    </Section>
  );
}
