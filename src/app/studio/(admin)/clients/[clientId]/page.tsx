import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, ActionForm, Field } from "@/components/form";
import { Badge, Empty, PageHeader, Section, buttonClass } from "@/components/ui";
import { inviteMemberAction, removeMemberAction, updateClientAction } from "@/features/clients/actions";
import { getClientDetails } from "@/features/clients/queries";
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

  return (
    <>
      <PageHeader
        title={client.name}
        eyebrow={
          <Link href="/studio/clients" className="underline underline-offset-4 hover:no-underline">
            {s.title}
          </Link>
        }
        actions={
          <Link href={`/studio/projects/new?client=${client.id}`} className={buttonClass.primary}>
            {s.newProject}
          </Link>
        }
      />

      <div className="grid gap-x-12 lg:grid-cols-2">
        <div>
          <Section id="projects" title={s.projects}>
            {projects.length === 0 ? (
              <Empty>{s.noProjects}</Empty>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {projects.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-4 py-3">
                    <Link href={`/studio/projects/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                    <Badge tone={p.status === "active" ? "neutral" : "muted"}>{t.studio.labels.projectStatus[p.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Agreements clientId={client.id} />

          <Section id="members" title={s.members}>
            {members.length === 0 ? (
              <Empty>{s.noMembers}</Empty>
            ) : (
              <ul className="mb-8 divide-y divide-line border-y border-line">
                {members.map((m) => {
                  const display = m.name ?? m.email;
                  return (
                    <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">{display}</p>
                        {m.name && <p className="text-sm text-muted">{m.email}</p>}
                      </div>
                      <ActionButton
                        action={removeMemberAction.bind(null, client.id, m.userId)}
                        label={t.common.remove}
                        ariaLabel={s.removeMember(display)}
                        confirm={s.confirmRemoveMember(display)}
                        variant="danger"
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            <h3 className="mb-2 font-serif text-xl">{s.inviteTitle}</h3>
            <p className="mb-4 text-sm text-muted">{s.inviteHint}</p>
            <ActionForm action={inviteMemberAction.bind(null, client.id)} submitLabel={s.inviteSubmit} pendingLabel={t.common.loading}>
              <Field label={s.inviteEmail} name="email" type="email" required autoComplete="off" />
              <Field label={s.inviteName} name="full_name" autoComplete="off" />
            </ActionForm>
          </Section>
        </div>

        <div>
          <Section id="details" title={s.details}>
            <ActionForm action={updateClientAction.bind(null, client.id)} submitLabel={s.save} pendingLabel={t.common.loading}>
              <ClientFields defaults={{ ...client, internal_notes: internalNotes }} />
            </ActionForm>
          </Section>
          <Privacy clientId={client.id} clientName={client.name} />
        </div>
      </div>
    </>
  );
}
