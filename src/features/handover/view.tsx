import { Fragment, type ReactNode } from "react";
import { Download, ExternalLink as ExternalIcon } from "lucide-react";
import { cardClass } from "@/components/ds/card";
import { Icon } from "@/components/ds/icon";
import { LinkChip } from "@/components/ds/link-chip";
import { PropertiesCard } from "@/components/ds/properties";
import { formatDate } from "@/lib/format/nb";
import { formatBytes } from "@/lib/format/file";
import { t } from "@/i18n/nb";
import { readContent, type SectionKind } from "./content";
import { CopyButton } from "./copy-button";
import { buttonVariants } from "@/components/ds/button";

const h = t.client.handover;
const dh = h.domain;

export type HandoverData = {
  clientName: string;
  projectName: string;
  liveUrl: string | null;
  cmsUrl: string | null;
  sections: { kind: SectionKind; title: string; content: unknown }[];
  site: {
    domain_name: string | null;
    registrar: string | null;
    domain_owner: "client" | "studio" | null;
    domain_renewal_date: string | null;
    hosting_provider: string | null;
    hosting_owner: "client" | "studio" | null;
    hosting_renewal_date: string | null;
    email_provider: string | null;
    dns_provider: string | null;
  } | null;
  files: { id: string; name: string; mime_type: string; size_bytes?: number; url: string | null }[];
};

const safe = (url: string | null | undefined) => (url && /^https?:\/\//i.test(url) ? url : null);

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-body-l">
      {text
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
    </div>
  );
}

// Rows inside a card, separated by inset lines (no line after the last row).
function Rows({ children }: { children: ReactNode[] }) {
  return (
    <ul className={cardClass("card", false)}>
      {children.map((child, i) => (
        <li key={i} className="relative flex min-h-12 flex-wrap items-center justify-between gap-3 px-4 py-2 md:px-5">
          {child}
          {i < children.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-4 right-0 h-px bg-separator md:left-5" />}
        </li>
      ))}
    </ul>
  );
}

const formatOf = (name: string, mime: string) => (name.split(".").pop() ?? mime.split("/").pop() ?? "").toUpperCase();

function Section({ kind, content, data }: { kind: SectionKind; content: unknown; data: HandoverData }) {
  switch (kind) {
    case "logos": {
      const c = readContent("logos", content);
      const files = c.file_ids.map((id) => data.files.find((f) => f.id === id)).filter((f) => f !== undefined);
      return (
        <>
          {c.intro && <Paragraphs text={c.intro} />}
          {files.length > 0 && (
            <Rows>
              {files.map((f) => (
                <Fragment key={f.id}>
                  <div className="flex min-w-0 items-center gap-3">
                    {f.url && f.mime_type.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                      <img src={f.url} alt="" className="size-10 shrink-0 rounded-nav bg-inset object-contain p-1" />
                    ) : (
                      <span aria-hidden="true" className="size-10 shrink-0 rounded-nav bg-inset" />
                    )}
                    <span className="min-w-0">
                      <span className="block break-all font-medium">{f.name}</span>
                      <span className="text-small text-ink-secondary">
                        {formatOf(f.name, f.mime_type)}
                        {f.size_bytes !== undefined && ` · ${formatBytes(f.size_bytes)}`}
                      </span>
                    </span>
                  </div>
                  {f.url && (
                    <a href={f.url} download={f.name} aria-label={h.download(f.name)} className={`${buttonVariants.secondary} shrink-0`}>
                      <Icon icon={Download} />
                      {t.client.files.download}
                    </a>
                  )}
                </Fragment>
              ))}
            </Rows>
          )}
        </>
      );
    }
    case "colours": {
      const c = readContent("colours", content);
      return (
        <Rows>
          {c.colours.map((colour) => (
            <Fragment key={colour.hex + colour.name}>
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="size-12 shrink-0 rounded-inset shadow-card" style={{ backgroundColor: colour.hex }} />
                <span>
                  <span className="block font-medium">{colour.name}</span>
                  <span className="text-small text-ink-secondary">{colour.hex}</span>
                </span>
              </div>
              <CopyButton value={colour.hex} label={h.copyLabel(colour.name, colour.hex)} className={buttonVariants.ghost} />
            </Fragment>
          ))}
        </Rows>
      );
    }
    case "fonts": {
      const c = readContent("fonts", content);
      return (
        <div className="flex flex-col gap-4">
          {c.fonts.map((font) => (
            <div key={font.name} className={`flex flex-col gap-2 ${cardClass("card")}`}>
              {font.usage && <p className="text-small text-ink-secondary">{font.usage}</p>}
              <p className="text-title-m" style={{ fontFamily: `"${font.name}", serif` }}>
                {font.name}
              </p>
              <p className="rounded-inset bg-inset p-3 text-body-l" style={{ fontFamily: `"${font.name}", serif` }}>
                {h.sample}
              </p>
              {safe(font.url) && (
                <div>
                  <LinkChip href={safe(font.url)!} label={h.getFont(font.name)} />
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    case "website_guide": {
      const c = readContent("website_guide", content);
      return (
        <div className={`flex flex-col gap-4 ${cardClass("card")}`}>
          {c.text && <Paragraphs text={c.text} />}
          {safe(data.cmsUrl) && (
            <a href={safe(data.cmsUrl)!} target="_blank" rel="noopener noreferrer" className={`${buttonVariants.primary} sm:self-start`}>
              {t.client.liveSite.edit}
              <Icon icon={ExternalIcon} />
              <span className="sr-only"> {t.client.newTab}</span>
            </a>
          )}
          {c.links.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {c.links.map((l) => (
                <li key={l.url}>
                  <LinkChip href={l.url} label={l.label} />
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    case "domain_hosting": {
      const c = readContent("domain_hosting", content);
      const s = data.site;
      const party = (p: "client" | "studio" | null | undefined) => (p ? h.party[p] : null);
      const rows = [
        { label: dh.domain, value: s?.domain_name },
        { label: dh.registrar, value: s?.registrar },
        { label: dh.owner, value: party(s?.domain_owner) },
        { label: dh.renewal, value: s?.domain_renewal_date && formatDate(s.domain_renewal_date) },
        { label: dh.hosting, value: s?.hosting_provider },
        { label: dh.hostingOwner, value: party(s?.hosting_owner) },
        { label: dh.hostingRenewal, value: s?.hosting_renewal_date && formatDate(s.hosting_renewal_date) },
        { label: dh.email, value: s?.email_provider },
        { label: dh.dns, value: s?.dns_provider },
      ].map((r) => ({ label: r.label, value: r.value || <span className="text-ink-secondary">{h.notSet}</span> }));
      return (
        <>
          <PropertiesCard items={rows} />
          {c.note && <Paragraphs text={c.note} />}
        </>
      );
    }
    case "links_contacts": {
      const c = readContent("links_contacts", content);
      return (
        <div className="flex flex-col gap-4">
          {c.links.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {c.links.map((l) => (
                <li key={l.url}>
                  <LinkChip href={l.url} label={l.label} />
                </li>
              ))}
            </ul>
          )}
          {c.contacts.length > 0 && (
            <Rows>
              {c.contacts.map((p) => (
                <span className="flex flex-col py-1" key={p.name + p.contact}>
                  <span className="font-medium">{p.name}</span>
                  {p.role && <span className="text-small text-ink-secondary">{p.role}</span>}
                  {p.contact && <span className="text-small">{p.contact}</span>}
                </span>
              ))}
            </Rows>
          )}
        </div>
      );
    }
    case "access_notes":
    case "custom": {
      const c = readContent(kind, content);
      return c.text ? (
        <div className={cardClass("card")}>
          <Paragraphs text={c.text} />
        </div>
      ) : null;
    }
  }
}

// The handover page itself: seed of the future Brand Hub, so every section is self-contained.
export function HandoverView({ data, headingLevel = 1 }: { data: HandoverData; headingLevel?: 1 | 2 }) {
  const Title = headingLevel === 1 ? "h1" : "h2";
  const SectionHeading = headingLevel === 1 ? "h2" : "h3";
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="text-small text-ink-secondary">{data.clientName}</p>
        <Title className="text-title-xl">{h.heading}</Title>
        <p className="text-body-l text-ink-secondary">{h.intro}</p>
        {safe(data.liveUrl) && (
          <div className="mt-2">
            <LinkChip href={safe(data.liveUrl)!} label={safe(data.liveUrl)!.replace(/^https?:\/\//, "").replace(/\/$/, "")} />
          </div>
        )}
      </header>
      {data.sections.map((section, i) => (
        <section key={i} aria-labelledby={`handover-${i}`} className="flex flex-col gap-4">
          <SectionHeading id={`handover-${i}`} className="text-title-l">
            {section.title}
          </SectionHeading>
          <Section kind={section.kind} content={section.content} data={data} />
        </section>
      ))}
    </div>
  );
}
