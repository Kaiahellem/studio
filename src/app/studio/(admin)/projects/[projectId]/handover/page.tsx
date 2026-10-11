import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditDisclosure } from "@/components/ds/add-row";
import { buttonVariants } from "@/components/ds/button";
import { Callout } from "@/components/ds/callout";
import { Card } from "@/components/ds/card";
import { EmptyState } from "@/components/ds/empty-state";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Section } from "@/components/ds/section";
import { Tag } from "@/components/ds/tag";
import { ActionButton, ActionForm, Checkbox, Field, TextArea } from "@/components/form";
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
          <TextArea label={h.intro} name="intro" rows={2} grow defaultValue={c.intro ?? ""} />
          <fieldset className="min-w-0">
            <legend className="mb-1 text-label">{h.kinds.logos}</legend>
            <p className="mb-2 text-small text-ink-secondary">{h.logosHint}</p>
            {files.length === 0 ? (
              <p className="text-ink-secondary">{h.noFiles}</p>
            ) : (
              <div className="flex flex-col [overflow-wrap:anywhere]">
                {files.map((f) => (
                  <Checkbox
                    key={f.id}
                    name="file_ids"
                    value={f.id}
                    defaultChecked={c.file_ids.includes(f.id)}
                    label={f.project_steps?.title ? `${f.name} · ${f.project_steps.title}` : f.name}
                  />
                ))}
              </div>
            )}
          </fieldset>
          <div>
            <p className="mb-2 text-label">{h.uploadFiles}</p>
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
      return <TextArea label={h.coloursLabel} hint={h.coloursHint} name="colours" rows={5} className="text-mono" defaultValue={joinLines(c.colours.map((x) => [x.name, x.hex]))} />;
    }
    case "fonts": {
      const c = readContent("fonts", section.content);
      return <TextArea label={h.fontsLabel} hint={h.fontsHint} name="fonts" rows={4} className="text-mono" defaultValue={joinLines(c.fonts.map((x) => [x.name, x.url, x.usage]))} />;
    }
    case "website_guide": {
      const c = readContent("website_guide", section.content);
      return (
        <>
          <TextArea label={h.text} name="text" rows={6} grow defaultValue={c.text} />
          <TextArea label={h.linksLabel} hint={h.linksHint} name="links" rows={3} className="text-mono" defaultValue={joinLines(c.links.map((l) => [l.label, l.url]))} />
        </>
      );
    }
    case "domain_hosting": {
      const c = readContent("domain_hosting", section.content);
      return (
        <>
          <p className="text-ink-secondary">
            {h.domainHostingHint}{" "}
            <Link href={`/studio/projects/${projectId}/site`} className="prose-link">
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
          <TextArea label={h.linksLabel} hint={h.linksHint} name="links" rows={4} className="text-mono" defaultValue={joinLines(c.links.map((l) => [l.label, l.url]))} />
          <TextArea label={h.contactsLabel} hint={h.contactsHint} name="contacts" rows={4} className="text-mono" defaultValue={joinLines(c.contacts.map((p) => [p.name, p.role, p.contact]))} />
        </>
      );
    }
    case "access_notes": {
      const c = readContent("access_notes", section.content);
      return <TextArea label={h.text} hint={h.accessHint} name="text" rows={4} defaultValue={c.text} />;
    }
    case "custom": {
      const c = readContent("custom", section.content);
      return <TextArea label={h.text} name="text" rows={6} grow defaultValue={c.text} />;
    }
  }
}

export default async function HandoverAdminPage({ params }: PageProps<"/studio/projects/[projectId]/handover">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const [{ project, page, files }, upload] = await Promise.all([getHandoverForAdmin(projectId), getUploadSettings()]);
  const publicUrl = page ? `${publicEnv.NEXT_PUBLIC_SITE_URL}/overlevering/${page.public_token}` : "";

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={h.heading} trail={[{ label: project.name, href: `/studio/projects/${project.id}` }]} eyebrow={project.clients?.name} />

      {!page ? (
        <Card>
          <EmptyState action={<ActionButton action={createHandoverAction.bind(null, project.id)} label={h.create} variant="primary" />}>{h.none}</EmptyState>
        </Card>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
          <section aria-labelledby="sections" className="flex min-w-0 flex-col gap-4">
            <h2 id="sections" className="text-title-l">
              {h.sections}
            </h2>
            <InsetGroupedList ordered label={h.sections}>
              {page.handover_sections.map((section) => (
                <InsetRow key={section.id}>
                  <div className="flex flex-col gap-1.5 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{section.title}</p>
                      <Tag>{h.kinds[section.kind as SectionKind]}</Tag>
                      {!section.visible && <Tag>{h.hidden}</Tag>}
                    </div>
                    <EditDisclosure label={h.editSection(section.title)}>
                      <ActionForm
                        action={updateSectionAction.bind(null, section.id, section.kind as SectionKind)}
                        submitLabel={h.saveSection}
                        pendingLabel={t.common.loading}
                      >
                        <Field label={h.sectionTitle} name="title" required defaultValue={section.title} />
                        <SectionFields section={section} files={files} projectId={project.id} upload={upload} />
                        <Checkbox label={h.visible} name="visible" defaultChecked={section.visible} />
                      </ActionForm>
                    </EditDisclosure>
                  </div>
                </InsetRow>
              ))}
            </InsetGroupedList>
            <div>
              <ActionButton action={addCustomSectionAction.bind(null, page.id)} label={h.addSection} variant="secondary" />
            </div>
          </section>

          <div className="flex min-w-0 flex-col gap-10">
            <Section id="status" title={h.status}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>{page.published_at ? h.published(formatDate(page.published_at)) : h.notPublished}</p>
                <ActionButton
                  action={setPublishedAction.bind(null, page.id, !page.published_at)}
                  label={page.published_at ? h.unpublish : h.publish}
                  variant={page.published_at ? "secondary" : "primary"}
                />
              </div>
            </Section>

            <Section id="public-link" title={h.publicLink} description={h.publicHint}>
              {page.public_enabled ? (
                <>
                  <p>{h.publicOn}</p>
                  {!page.published_at && <Callout tone="warning">{h.publicNeedsPublish}</Callout>}
                  <p className="rounded-inset bg-inset p-3 text-mono [overflow-wrap:anywhere]">{publicUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton value={publicUrl} label={h.copyLink} className={buttonVariants.secondary} />
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants.secondary}>
                      {h.preview}
                      <span className="sr-only"> {t.client.newTab}</span>
                    </a>
                    <ActionButton action={regenerateTokenAction.bind(null, page.id)} label={h.regenerate} confirm={h.confirmRegenerate} variant="ghost" />
                    <ActionButton action={setPublicAction.bind(null, page.id, false)} label={h.disablePublic} variant="destructive" />
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p>{h.publicOff}</p>
                  <ActionButton action={setPublicAction.bind(null, page.id, true)} label={h.enablePublic} variant="secondary" />
                </div>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
