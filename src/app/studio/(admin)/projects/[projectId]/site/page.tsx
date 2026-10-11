import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { cardClass } from "@/components/ds/card";
import { PageHeader } from "@/components/ds/page-header";
import { ActionForm, Field, Select, TextArea } from "@/components/form";
import { updateSiteAction } from "@/features/handover/actions";
import { getSiteForAdmin } from "@/features/handover/queries";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";

const s = t.studio.site;

export const metadata: Metadata = { title: s.heading };

const partyOptions = [
  { value: "", label: s.unknown },
  { value: "client", label: t.client.handover.party.client },
  { value: "studio", label: t.client.handover.party.studio },
];

// One card per group; the Title M heading is the fieldset's legend.
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className={`flex min-w-0 flex-col gap-5 ${cardClass("card")}`}>
      <legend className="float-left mb-1 w-full text-title-m">{title}</legend>
      {children}
    </fieldset>
  );
}

export default async function SitePage({ params }: PageProps<"/studio/projects/[projectId]/site">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const { project, site } = await getSiteForAdmin(projectId);
  const v = (key: keyof NonNullable<typeof site>) => (site?.[key] as string | null | undefined) ?? "";

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <PageHeader title={s.heading} trail={[{ label: project.name, href: `/studio/projects/${project.id}` }]} eyebrow={project.clients?.name} />
      <p className="max-w-prose text-ink-secondary">{s.intro}</p>
      <ActionForm action={updateSiteAction.bind(null, project.id)} submitLabel={s.save} pendingLabel={t.common.loading}>
        <Group title={s.groups.domain}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={s.domain_name} name="domain_name" defaultValue={v("domain_name")} />
            <Field label={s.registrar} name="registrar" defaultValue={v("registrar")} />
            <Select label={s.domain_owner} name="domain_owner" defaultValue={v("domain_owner")} options={partyOptions} />
            <Field label={s.domain_renewal_date} name="domain_renewal_date" type="date" defaultValue={v("domain_renewal_date")} />
          </div>
        </Group>
        <Group title={s.groups.hosting}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={s.hosting_provider} name="hosting_provider" defaultValue={v("hosting_provider")} />
            <Select label={s.hosting_owner} name="hosting_owner" defaultValue={v("hosting_owner")} options={partyOptions} />
            <Field label={s.hosting_renewal_date} name="hosting_renewal_date" type="date" defaultValue={v("hosting_renewal_date")} />
            <Field label={s.dns_provider} name="dns_provider" defaultValue={v("dns_provider")} />
          </div>
          <Field label={s.email_provider} hint={s.emailHint} name="email_provider" defaultValue={v("email_provider")} />
        </Group>
        <Group title={s.groups.other}>
          <TextArea label={s.access_notes} hint={t.studio.handover.accessHint} name="access_notes" rows={3} grow defaultValue={v("access_notes")} />
          <Field
            label={s.google_business_profile_url}
            hint={t.studio.projects.urlHint}
            name="google_business_profile_url"
            type="url"
            defaultValue={v("google_business_profile_url")}
          />
          <TextArea label={s.analytics_notes} name="analytics_notes" rows={3} grow defaultValue={v("analytics_notes")} />
        </Group>
      </ActionForm>
    </div>
  );
}
