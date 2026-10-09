import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, Field, Select, TextArea } from "@/components/form";
import { PageHeader } from "@/components/ui";
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

export default async function SitePage({ params }: PageProps<"/studio/projects/[projectId]/site">) {
  const { projectId } = await params;
  if (!uuid.safeParse(projectId).success) notFound();
  const { project, site } = await getSiteForAdmin(projectId);
  const v = (key: keyof NonNullable<typeof site>) => (site?.[key] as string | null | undefined) ?? "";

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={s.heading}
        eyebrow={
          <Link href={`/studio/projects/${project.id}`} className="underline underline-offset-4 hover:no-underline">
            {project.clients?.name} · {project.name}
          </Link>
        }
      />
      <p className="mb-8 max-w-prose text-muted">{s.intro}</p>
      <ActionForm action={updateSiteAction.bind(null, project.id)} submitLabel={s.save} pendingLabel={t.common.loading}>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label={s.domain_name} name="domain_name" defaultValue={v("domain_name")} />
          <Field label={s.registrar} name="registrar" defaultValue={v("registrar")} />
          <Select label={s.domain_owner} name="domain_owner" defaultValue={v("domain_owner")} options={partyOptions} />
          <Field label={s.domain_renewal_date} name="domain_renewal_date" type="date" defaultValue={v("domain_renewal_date")} />
          <Field label={s.hosting_provider} name="hosting_provider" defaultValue={v("hosting_provider")} />
          <Select label={s.hosting_owner} name="hosting_owner" defaultValue={v("hosting_owner")} options={partyOptions} />
          <Field label={s.hosting_renewal_date} name="hosting_renewal_date" type="date" defaultValue={v("hosting_renewal_date")} />
          <Field label={s.dns_provider} name="dns_provider" defaultValue={v("dns_provider")} />
        </div>
        <Field label={s.email_provider} hint={s.emailHint} name="email_provider" defaultValue={v("email_provider")} />
        <TextArea label={s.access_notes} hint={t.studio.handover.accessHint} name="access_notes" rows={3} defaultValue={v("access_notes")} />
        <Field label={s.google_business_profile_url} hint={t.studio.projects.urlHint} name="google_business_profile_url" type="url" defaultValue={v("google_business_profile_url")} />
        <TextArea label={s.analytics_notes} name="analytics_notes" rows={3} defaultValue={v("analytics_notes")} />
      </ActionForm>
    </div>
  );
}
