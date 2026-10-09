import { formatDate } from "@/lib/format/date";
import { formatBytes } from "@/lib/format/file";
import { t } from "@/i18n/nb";
import { inkOn, readContent, type SectionKind } from "./content";
import { CopyButton } from "./copy-button";

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

function ExternalLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className ?? "underline underline-offset-4 hover:no-underline"}>
      {children}
      <span aria-hidden="true">&nbsp;↗</span>
      <span className="sr-only"> {t.client.newTab}</span>
    </a>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="flex max-w-prose flex-col gap-3 leading-relaxed">
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

function Section({ kind, content, data }: { kind: SectionKind; content: unknown; data: HandoverData }) {
  switch (kind) {
    case "logos": {
      const c = readContent("logos", content);
      const files = c.file_ids.map((id) => data.files.find((f) => f.id === id)).filter((f) => f !== undefined);
      return (
        <>
          {c.intro && <Paragraphs text={c.intro} />}
          <ul className="grid gap-4 sm:grid-cols-2">
            {files.map((f) => (
              <li key={f.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
                {f.url && f.mime_type.startsWith("image/") && (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                  <img src={f.url} alt="" className="h-28 w-full object-contain" />
                )}
                <p className="break-all text-sm font-medium">{f.name}</p>
                {f.url && (
                  <a href={f.url} download={f.name} className="text-sm underline underline-offset-4 hover:no-underline">
                    {h.download(f.name)}
                    {f.size_bytes !== undefined && <span className="text-muted"> ({formatBytes(f.size_bytes)})</span>}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </>
      );
    }
    case "colours": {
      const c = readContent("colours", content);
      return (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {c.colours.map((colour) => (
            <li key={colour.hex + colour.name} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="flex h-24 items-end p-3 text-sm" style={{ backgroundColor: colour.hex, color: inkOn(colour.hex) }} aria-hidden="true">
                {colour.hex}
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{colour.name}</p>
                  <p className="font-mono text-sm text-muted">{colour.hex}</p>
                </div>
                <CopyButton
                  value={colour.hex}
                  label={h.copyLabel(colour.name, colour.hex)}
                  className="h-9 shrink-0 rounded-md border border-field-border px-3 text-sm hover:bg-paper"
                />
              </div>
            </li>
          ))}
        </ul>
      );
    }
    case "fonts": {
      const c = readContent("fonts", content);
      return (
        <ul className="flex flex-col gap-6">
          {c.fonts.map((font) => (
            <li key={font.name} className="border-b border-line pb-6">
              <p className="text-sm text-muted">{font.usage}</p>
              <p className="text-2xl" style={{ fontFamily: `"${font.name}", serif` }}>
                {font.name}
              </p>
              <p className="mt-1 text-lg text-muted" style={{ fontFamily: `"${font.name}", serif` }} aria-hidden="true">
                {h.sample}
              </p>
              {safe(font.url) && (
                <p className="mt-2 text-sm">
                  <ExternalLink href={safe(font.url)!}>{h.getFont(font.name)}</ExternalLink>
                </p>
              )}
            </li>
          ))}
        </ul>
      );
    }
    case "website_guide": {
      const c = readContent("website_guide", content);
      return (
        <>
          {c.text && <Paragraphs text={c.text} />}
          {safe(data.cmsUrl) && (
            <ExternalLink
              href={safe(data.cmsUrl)!}
              className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 font-medium text-accent-ink hover:opacity-90 sm:self-start"
            >
              {t.client.liveSite.edit}
            </ExternalLink>
          )}
          {c.links.length > 0 && (
            <ul className="flex flex-col gap-2">
              {c.links.map((l) => (
                <li key={l.url}>
                  <ExternalLink href={l.url}>{l.label}</ExternalLink>
                </li>
              ))}
            </ul>
          )}
        </>
      );
    }
    case "domain_hosting": {
      const c = readContent("domain_hosting", content);
      const s = data.site;
      const party = (p: "client" | "studio" | null | undefined) => (p ? h.party[p] : null);
      const rows: [string, string | null | undefined][] = [
        [dh.domain, s?.domain_name],
        [dh.registrar, s?.registrar],
        [dh.owner, party(s?.domain_owner)],
        [dh.renewal, s?.domain_renewal_date && formatDate(s.domain_renewal_date)],
        [dh.hosting, s?.hosting_provider],
        [dh.hostingOwner, party(s?.hosting_owner)],
        [dh.hostingRenewal, s?.hosting_renewal_date && formatDate(s.hosting_renewal_date)],
        [dh.email, s?.email_provider],
        [dh.dns, s?.dns_provider],
      ];
      return (
        <>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted">{label}</dt>
                <dd>{value || <span className="text-muted">{h.notSet}</span>}</dd>
              </div>
            ))}
          </dl>
          {c.note && <Paragraphs text={c.note} />}
        </>
      );
    }
    case "links_contacts": {
      const c = readContent("links_contacts", content);
      return (
        <div className="grid gap-8 sm:grid-cols-2">
          {c.links.length > 0 && (
            <ul className="flex flex-col gap-2">
              {c.links.map((l) => (
                <li key={l.url}>
                  <ExternalLink href={l.url}>{l.label}</ExternalLink>
                </li>
              ))}
            </ul>
          )}
          {c.contacts.length > 0 && (
            <ul className="flex flex-col gap-4">
              {c.contacts.map((p) => (
                <li key={p.name + p.contact}>
                  <p className="font-medium">{p.name}</p>
                  {p.role && <p className="text-sm text-muted">{p.role}</p>}
                  {p.contact && <p className="text-sm">{p.contact}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    case "access_notes":
    case "custom": {
      const c = readContent(kind, content);
      return c.text ? <Paragraphs text={c.text} /> : null;
    }
  }
}

// The handover page itself: seed of the future Brand Hub, so every section is self-contained.
export function HandoverView({ data, headingLevel = 1 }: { data: HandoverData; headingLevel?: 1 | 2 }) {
  const Title = headingLevel === 1 ? "h1" : "h2";
  const SectionHeading = headingLevel === 1 ? "h2" : "h3";
  return (
    <div className="flex flex-col gap-14">
      <header className="flex flex-col gap-3">
        <p className="text-muted">{data.clientName}</p>
        <Title className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{h.heading}</Title>
        <p className="max-w-prose text-lg leading-relaxed text-muted">{h.intro}</p>
        {safe(data.liveUrl) && (
          <p>
            <ExternalLink href={safe(data.liveUrl)!}>{safe(data.liveUrl)!.replace(/^https?:\/\//, "").replace(/\/$/, "")}</ExternalLink>
          </p>
        )}
      </header>
      {data.sections.map((section, i) => (
        <section key={i} aria-labelledby={`handover-${i}`} className="flex flex-col gap-6">
          <SectionHeading id={`handover-${i}`} className="border-b border-line pb-2 font-serif text-2xl">
            {section.title}
          </SectionHeading>
          <Section kind={section.kind} content={section.content} data={data} />
        </section>
      ))}
    </div>
  );
}
