import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, ActionForm, Checkbox, Field, TextArea } from "@/components/form";
import { Badge, PageHeader, Section, buttonClass } from "@/components/ui";
import {
  addCustomSectionAction,
  createHandoverAction,
  createStudioUploadAction,
  regenerateTokenAction,
  registerStudioUploadAction,
  setPublicAction,
  setPublishedAction,
  updateSectionAction,
} from "@/features/handover/actions";
import { joinLines, readContent, type SectionKind } from "@/features/handover/content";
import { CopyButton } from "@/features/handover/copy-button";
import { getHandoverForAdmin } from "@/features/handover/queries";
import { UploadPanel } from "@/features/steps/components/upload-panel";
import { getUploadSettings } from "@/features/steps/settings";
import { formatDate } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { publicEnv } from "@/lib/public-env";
import { t } from "@/i18n/nb";

const h = t.studio.handover;

export const metadata: Metadata = { title: h.heading };

type Data = Awaited<ReturnType<typeof getHandoverForAdmin>>;
type SectionRow = NonNullable<Data["page"]>["handover_sections"][number];

// Kind-specific fields. Lists are edited as lines of "part | part" (see content.ts).
function SectionFields({ section, files, projectId, upload }: { section: SectionRow; files: Data["files"]; projectId: string; upload: Awaited<ReturnType<typeof getUploadSettings>> }) {
  const kind = section.kind as SectionKind;
  switch (kind) {
    case "logos": {
      const c = readContent("logos", section.content);
      return (
        <>
          <TextArea label={h.intro} name="intro" rows={2} defaultValue={c.intro ?? ""} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{h.kinds.logos}</legend>
            <p className="mb-3 text-sm text-muted">{h.logosHint}</p>
            {files.length === 0 ? (
              <p className="text-sm text-muted">{h.noFiles}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {files.map((f) => (
                  <label key={f.id} className="flex items-center gap-3 text-sm">
                    <input type="checkbox" name="file_ids" value={f.id} defaultChecked={c.file_ids.includes(f.id)} className="size-5 accent-accent" />
                    <span className="break-all">{f.name}</span>
                    {f.project_steps?.title && <span className="text-muted">· {f.project_steps.title}</span>}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <div>
            <p className="mb-2 text-sm font-medium">{h.uploadFiles}</p>
            <UploadPanel
              create={createStudioUploadAction.bind(null, projectId)}
              register={registerStudioUploadAction.bind(null, projectId)}
              maxBytes={upload.maxBytes}
              allowedTypes={upload.allowedTypes}
            />
          </div>
        </>
      );
    }
    case "colours": {
      const c = readContent("colours", section.content);
      return <TextArea label={h.coloursLabel} hint={h.coloursHint} name="colours" rows={5} className="font-mono text-sm" defaultValue={joinLines(c.colours.map((x) => [x.name, x.hex]))} />;
    }
    case "fonts": {
      const c = readContent("fonts", section.content);
      return <TextArea label={h.fontsLabel} hint={h.fontsHint} name="fonts" rows={4} className="font-mono text-sm" defaultValue={joinLines(c.fonts.map((x) => [x.name, x.url, x.usage]))} />;
    }
    case "website_guide": {
      const c = readContent("website_guide", section.content);
      return (
        <>
          <TextArea label={h.text} name="text" rows={6} defaultValue={c.text} />
          <TextArea label={h.linksLabel} hint={h.linksHint} name="links" rows={3} className="font-mono text-sm" defaultValue={joinLines(c.links.map((l) => [l.label, l.url]))} />
        </>
      );
    }
    case "domain_hosting": {
      const c = readContent("domain_hosting", section.content);
      return (
        <>
          <p className="text-sm text-muted">
            {h.domainHostingHint}{" "}
            <Link href={`/studio/projects/${projectId}/site`} className="underline underline-offset-4">
              {t.studio.site.heading}
            </Link>
          </p>
          <TextArea label={h.note} name="note" rows={2} defaultValue={c.note ?? ""} />
        </>
      );
    }
    case "links_contacts": {
      const c = readContent("links_contacts", section.content);
      return (
        <>
          <TextArea label={h.linksLabel} hint={h.linksHint} name="links" rows={4} className="font-mono text-sm" defaultValue={joinLines(c.links.map((l) => [l.label, l.url]))} />
          <TextArea label={h.contactsLabel} hint={h.contactsHint} name="contacts" rows={4} className="font-mono text-sm" defaultValue={joinLines(c.contacts.map((p) => [p.name, p.role, p.contact]))} />
        </>
      );
    }
    case "access_notes": {
      const c = readContent("access_notes", section.content);
      return <TextArea label={h.text} hint={h.accessHint} name="text" rows={4} defaultValue={c.text} />;
    }
    case "custom": {
      const c = readContent("custom", section.content);
      return <TextArea label={h.text} name="text" rows={6} defaultValue={c.text} />;
    }
  }
}

export default async function HandoverAdminPage({ params }: PageProps<"/studio/projects/[projectId]/handover">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const [{ project, page, files }, upload] = await Promise.all([getHandoverForAdmin(projectId), getUploadSettings()]);
  const publicUrl = page ? `${publicEnv.NEXT_PUBLIC_SITE_URL}/overlevering/${page.public_token}` : "";

  return (
    <>
      <PageHeader
        title={h.heading}
        eyebrow={
          <Link href={`/studio/projects/${project.id}`} className="underline underline-offset-4 hover:no-underline">
            {project.clients?.name} · {project.name}
          </Link>
        }
      />

      {!page ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-muted">{h.none}</p>
          <ActionButton action={createHandoverAction.bind(null, project.id)} label={h.create} variant="primary" />
        </div>
      ) : (
        <div className="grid gap-x-12 lg:grid-cols-[3fr_2fr]">
          <Section id="sections" title={h.sections}>
            <ol className="flex flex-col gap-4">
              {page.handover_sections.map((section) => (
                <li key={section.id} className="rounded-lg border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{section.title}</p>
                    <Badge tone="muted">{h.kinds[section.kind as SectionKind]}</Badge>
                    {!section.visible && <Badge tone="muted">{h.hidden}</Badge>}
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm underline underline-offset-4 hover:no-underline">{h.editSection(section.title)}</summary>
                    <div className="mt-4">
                      <ActionForm
                        action={updateSectionAction.bind(null, section.id, section.kind as SectionKind)}
                        submitLabel={h.saveSection}
                        pendingLabel={t.common.loading}
                      >
                        <Field label={h.sectionTitle} name="title" required defaultValue={section.title} />
                        <SectionFields section={section} files={files} projectId={project.id} upload={upload} />
                        <Checkbox label={h.visible} name="visible" defaultChecked={section.visible} />
                      </ActionForm>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
            <div className="mt-6">
              <ActionButton action={addCustomSectionAction.bind(null, page.id)} label={h.addSection} />
            </div>
          </Section>

          <div>
            <Section id="status" title={h.status}>
              <p className="mb-4">{page.published_at ? h.published(formatDate(page.published_at)) : h.notPublished}</p>
              <div className="flex flex-wrap gap-3">
                <ActionButton
                  action={setPublishedAction.bind(null, page.id, !page.published_at)}
                  label={page.published_at ? h.unpublish : h.publish}
                  variant={page.published_at ? "small" : "primary"}
                />
              </div>
            </Section>

            <Section id="public-link" title={h.publicLink}>
              <p className="mb-4 text-sm text-muted">{h.publicHint}</p>
              {page.public_enabled ? (
                <div className="flex flex-col gap-4">
                  <p>{h.publicOn}</p>
                  {!page.published_at && <p className="text-sm font-medium text-danger">{h.publicNeedsPublish}</p>}
                  <p className="break-all rounded-md bg-paper p-3 font-mono text-sm">{publicUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton value={publicUrl} label={h.copyLink} className={buttonClass.small} />
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={buttonClass.small}>
                      {h.preview}
                    </a>
                    <ActionButton action={regenerateTokenAction.bind(null, page.id)} label={h.regenerate} confirm={h.confirmRegenerate} />
                    <ActionButton action={setPublicAction.bind(null, page.id, false)} label={h.disablePublic} variant="danger" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-4">
                  <p>{h.publicOff}</p>
                  <ActionButton action={setPublicAction.bind(null, page.id, true)} label={h.enablePublic} />
                </div>
              )}
            </Section>
          </div>
        </div>
      )}
    </>
  );
}
