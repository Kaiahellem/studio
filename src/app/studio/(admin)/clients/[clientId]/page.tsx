import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AddRow } from "@/components/ds/add-row";
import { ButtonLink } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { Icon } from "@/components/ds/icon";
import { InsetGroupedList, InsetRow } from "@/components/ds/list-row";
import { PageHeader } from "@/components/ds/page-header";
import { Section } from "@/components/ds/section";
import { Tag } from "@/components/ds/tag";
import { ActionButton, ActionForm, Field } from "@/components/form";
import { inviteMemberAction, removeMemberAction, updateClientAction } from "@/features/clients/actions";
import { getClientDetails } from "@/features/clients/queries";
import { formatOrgNumber, formatPhone, telHref } from "@/lib/format/nb";
import { uuid } from "@/lib/forms";
import { t } from "@/i18n/nb";
import { ClientFields } from "../client-fields";
import { Agreements } from "./agreements";
import { Privacy } from "./privacy";

const s = t.studio.clients;

export const metadata: Metadata = { title: s.title };

export default async function ClientPage({ params }: PageProps<"/studio/clients/[clientId]">) {
  const { clientId } = await params;
  if (!uuid.safeParse(clientId).success) notFound();
  const details = await getClientDetails(clientId);
  if (!details) notFound();
  const { client, internalNotes, members, projects } = details;
  const tel = client.contact_phone ? telHref(client.contact_phone) : null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={client.name}
        trail={[{ label: s.title, href: "/studio/clients" }]}
        actions={
          <ButtonLink href={`/studio/projects/new?client=${client.id}`} variant="primary">
            {s.newProject}
          </ButtonLink>
        }
        properties={[
          { label: s.orgNumber, value: client.org_number ? formatOrgNumber(client.org_number) : null },
          {
            label: s.contactPhone,
            value: client.contact_phone ? (
              tel ? (
                <a href={tel} className="prose-link">
                  {formatPhone(client.contact_phone)}
                </a>
              ) : (
                client.contact_phone
              )
            ) : null,
          },
          {
            label: s.contactEmail,
            value: client.contact_email ? (
              <a href={`mailto:${client.contact_email}`} className="prose-link break-all">
                {client.contact_email}
              </a>
            ) : null,
          },
          { label: s.address, value: client.address },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-10">
          <Section id="projects" title={s.projects} card={false}>
            {projects.length === 0 ? (
              <Card>
                <p className="text-ink-secondary">{s.noProjects}</p>
              </Card>
            ) : (
              <InsetGroupedList label={s.projects}>
                {projects.map((p) => (
                  <InsetRow key={p.id}>
                    <Link href={`/studio/projects/${p.id}`} className="flex items-center justify-between gap-3 py-1">
                      <span className="font-medium">{p.name}</span>
                      <span className="flex items-center gap-2">
                        <Tag tone={p.status === "active" ? "slate" : p.status === "completed" ? "sage" : "neutral"}>{t.studio.labels.projectStatus[p.status]}</Tag>
                        <Icon icon={ChevronRight} className="text-ink-secondary" />
                      </span>
                    </Link>
                  </InsetRow>
                ))}
              </InsetGroupedList>
            )}
          </Section>

          <Agreements clientId={client.id} />

          <Section id="members" title={s.members} card={false}>
            {members.length === 0 ? (
              <Card>
                <p className="text-ink-secondary">{s.noMembers}</p>
              </Card>
            ) : (
              <InsetGroupedList label={s.members}>
                {members.map((m) => {
                  const display = m.name ?? m.email;
                  return (
                    <InsetRow
                      key={m.userId}
                      actions={
                        <ActionButton
                          action={removeMemberAction.bind(null, client.id, m.userId)}
                          label={t.common.remove}
                          ariaLabel={s.removeMember(display)}
                          confirm={s.confirmRemoveMember(display)}
                          variant="ghost"
                        />
                      }
                    >
                      <div className="py-1">
                        <p className="font-medium">{display}</p>
                        {m.name && <p className="break-all text-body-compact text-ink-secondary">{m.email}</p>}
                      </div>
                    </InsetRow>
                  );
                })}
              </InsetGroupedList>
            )}
            <AddRow label={s.inviteTitle}>
              <Card className="flex flex-col gap-4">
                <p className="text-small text-ink-secondary">{s.inviteHint}</p>
                <ActionForm action={inviteMemberAction.bind(null, client.id)} submitLabel={s.inviteSubmit} pendingLabel={t.common.loading}>
                  <Field label={s.inviteEmail} name="email" type="email" required autoComplete="off" />
                  <Field label={s.inviteName} name="full_name" autoComplete="off" />
                </ActionForm>
              </Card>
            </AddRow>
          </Section>
        </div>

        <div className="flex flex-col gap-10">
          <Section id="details" title={s.details}>
            <ActionForm action={updateClientAction.bind(null, client.id)} submitLabel={s.save} pendingLabel={t.common.loading}>
              <ClientFields defaults={{ ...client, org_number: client.org_number ? formatOrgNumber(client.org_number) : null, contact_phone: client.contact_phone ? formatPhone(client.contact_phone) : null, internal_notes: internalNotes }} />
            </ActionForm>
          </Section>
          <Privacy clientId={client.id} clientName={client.name} />
        </div>
      </div>
    </div>
  );
}
