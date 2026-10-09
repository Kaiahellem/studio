import "server-only";
import { after } from "next/server";
import { renderEmail, type EmailContent } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";
import { formatDate, todayInOslo } from "@/lib/format/date";
import { formatMinutes } from "@/lib/format/money";
import { publicEnv } from "@/lib/public-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { stepTurn, toTurnStep } from "@/features/projects/turn";
import { t } from "@/i18n/nb";

// Notifications (BRIEF.md, "Notifications and reminders"). Everything here runs after the
// caller's own access checks, with the service role, and never blocks the user: schedule()
// sends after the response, and failures are logged instead of thrown.

const e = t.emails;
const db = () => createAdminClient();
const url = (path: string) => new URL(path, publicEnv.NEXT_PUBLIC_SITE_URL).toString();

export function schedule(task: () => Promise<unknown>) {
  after(async () => {
    try {
      await task();
    } catch (error) {
      console.error("notification failed:", error);
    }
  });
}

// ---------------------------------------------------------------------------
// Recipients and the send log
// ---------------------------------------------------------------------------

// A few lookups at a time, so a burst of notifications never floods the auth service.
async function emailsOf(userIds: string[]): Promise<string[]> {
  const ids = [...new Set(userIds)];
  const emails: string[] = [];
  for (let i = 0; i < ids.length; i += 5) {
    const users = await Promise.all(ids.slice(i, i + 5).map((id) => db().auth.admin.getUserById(id)));
    for (const u of users) if (u.data.user?.email) emails.push(u.data.user.email);
  }
  return emails;
}

async function clientEmails(clientId: string, except?: string | null) {
  const { data } = await db().from("client_members").select("user_id").eq("client_id", clientId);
  return emailsOf((data ?? []).map((m) => m.user_id).filter((id) => id !== except));
}

async function studioEmails() {
  const { data } = await db().from("admins").select("user_id");
  return emailsOf((data ?? []).map((a) => a.user_id));
}

async function isStudio(userId: string | null) {
  if (!userId) return false;
  const { data } = await db().from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

async function sentSince(kind: string, entityId: string, since?: Date): Promise<boolean> {
  let query = db().from("email_log").select("id").eq("kind", kind).eq("entity_id", entityId).limit(1);
  if (since) query = query.gte("sent_at", since.toISOString());
  const { data } = await query;
  return Boolean(data?.length);
}

async function deliver(kind: string, entityIds: string[], to: string[], subject: string, content: EmailContent) {
  if (to.length === 0) return;
  const { html, text } = renderEmail(content);
  const id = await sendEmail({ to, subject, html, text });
  await db()
    .from("email_log")
    .insert(entityIds.flatMap((entity_id) => to.map((recipient) => ({ kind, entity_id, recipient, resend_id: id }))));
}

async function projectInfo(projectId: string) {
  const { data } = await db().from("projects").select("id, name, client_id, reminders_enabled, status, clients(name)").eq("id", projectId).single();
  if (!data) throw new Error(`project ${projectId} not found`);
  return { ...data, clientName: data.clients?.name ?? "" };
}

// ---------------------------------------------------------------------------
// To the client
// ---------------------------------------------------------------------------

type WaitingStep = { id: string; title: string; entity: string; since: string | null; round: number | null };

// Visible steps where it is the client's turn. For approvals, the open round is what they wait on.
async function clientTurnSteps(projectId: string): Promise<WaitingStep[]> {
  const { data } = await db()
    .from("project_steps")
    .select("id, title, status, owner, type, activated_at, position, project_phases(position), approval_rounds(id, round, opened_at, approvals(id))")
    .eq("project_id", projectId)
    .eq("status", "active")
    .eq("visible_to_client", true);
  return (data ?? [])
    .filter((s) => stepTurn(toTurnStep(s)) === "client")
    .sort((a, b) => (a.project_phases?.position ?? 0) - (b.project_phases?.position ?? 0) || a.position - b.position)
    .map((s) => {
      const open = s.type === "approval" ? s.approval_rounds.find((r) => !r.approvals) : undefined;
      return { id: s.id, title: s.title, entity: open?.id ?? s.id, since: open?.opened_at ?? s.activated_at, round: open?.round ?? null };
    });
}

// "A step becomes their turn": called after anything that can move the project forward.
// One email for everything that became theirs at once (a parallel phase can open five steps).
export async function notifyClientTurns(projectId: string) {
  const project = await projectInfo(projectId);
  const waiting = await clientTurnSteps(projectId);
  const fresh: WaitingStep[] = [];
  for (const step of waiting) if (!(await sentSince("turn", step.entity))) fresh.push(step);
  if (fresh.length === 0) return;

  const to = await clientEmails(project.client_id);
  const one = fresh.length === 1 ? fresh[0] : null;
  await deliver(
    "turn",
    fresh.map((s) => s.entity),
    to,
    one ? e.turn.subjectOne(one.title) : e.turn.subjectMany(fresh.length),
    {
      heading: e.turn.heading,
      lines: one ? [e.turn.bodyOne(one.title, project.name), ...(one.round ? [e.turn.round(one.round)] : [])] : [e.turn.bodyMany(project.name)],
      list: one ? undefined : fresh.map((s) => s.title),
      button: one ? { label: e.openStep, url: url(`/p/${projectId}/steg/${one.id}`) } : { label: e.openProject, url: url(`/p/${projectId}`) },
      footer: e.footerClient,
    },
  );
}

export async function notifyClientTurnsForStep(stepId: string) {
  const { data } = await db().from("project_steps").select("project_id").eq("id", stepId).single();
  if (data) await notifyClientTurns(data.project_id);
}

export async function notifyRequestStatus(requestId: string, previous: string) {
  const { data: request } = await db().from("change_requests").select("id, title, status, project_id, client_id").eq("id", requestId).single();
  if (!request || request.status === previous) return;
  const status = t.client.requests.status[request.status];
  await deliver(`request.status.${request.status}`, [request.id], await clientEmails(request.client_id), e.requestStatus.subject(request.title), {
    heading: e.requestStatus.heading,
    lines: [e.requestStatus.body(request.title, status)],
    button: { label: e.openRequest, url: url(`/p/${request.project_id}/endringer/${request.id}`) },
    footer: e.footerClient,
  });
}

// ---------------------------------------------------------------------------
// Comments go to the other side
// ---------------------------------------------------------------------------

export async function notifyComment(commentId: string) {
  const { data: comment } = await db().from("comments").select("id, internal, author_id, step_id, change_request_id, project_id").eq("id", commentId).single();
  if (!comment || comment.internal) return;
  const project = await projectInfo(comment.project_id);
  const title = comment.step_id
    ? (await db().from("project_steps").select("title").eq("id", comment.step_id).single()).data?.title
    : (await db().from("change_requests").select("title").eq("id", comment.change_request_id!).single()).data?.title;
  if (!title) return;

  if (await isStudio(comment.author_id)) {
    const path = comment.step_id ? `/p/${project.id}/steg/${comment.step_id}` : `/p/${project.id}/endringer/${comment.change_request_id}`;
    await deliver("comment.reply", [comment.id], await clientEmails(project.client_id, comment.author_id), e.reply.subject(title), {
      heading: e.reply.heading,
      lines: [e.reply.body(title)],
      button: { label: comment.step_id ? e.openStep : e.openRequest, url: url(path) },
      footer: e.footerClient,
    });
  } else {
    const path = comment.step_id ? `/studio/projects/${project.id}/steps/${comment.step_id}` : `/studio/change-requests/${comment.change_request_id}`;
    await notifyStudio("comment", [comment.id], e.studio.comment(project.clientName, title), [], path);
  }
}

// ---------------------------------------------------------------------------
// To the studio
// ---------------------------------------------------------------------------

async function notifyStudio(kind: string, entityIds: string[], subject: string, lines: string[], path: string) {
  await deliver(`studio.${kind}`, entityIds, await studioEmails(), subject, {
    heading: subject,
    lines,
    button: { label: e.studio.open, url: url(path) },
    footer: e.footerStudio,
  });
}

async function stepContext(stepId: string) {
  const { data: step } = await db().from("project_steps").select("id, title, project_id").eq("id", stepId).single();
  if (!step) throw new Error(`step ${stepId} not found`);
  const project = await projectInfo(step.project_id);
  return { step, project, adminPath: `/studio/projects/${project.id}/steps/${step.id}` };
}

export async function notifyApproval(stepId: string, decision: "approved" | "changes_requested", roundsUsedUp: boolean) {
  const { step, project, adminPath } = await stepContext(stepId);
  const subject = decision === "approved" ? e.studio.approved(project.clientName, step.title) : e.studio.changes(project.clientName, step.title);
  await notifyStudio(decision, [step.id], subject, [], adminPath);
  if (roundsUsedUp) {
    await notifyStudio("rounds_used_up", [step.id], e.studio.roundsUsed(project.clientName, step.title), [e.studio.roundsUsedBody], adminPath);
  }
}

export async function notifyFormSubmitted(stepId: string) {
  const { step, project, adminPath } = await stepContext(stepId);
  await notifyStudio("form", [step.id], e.studio.form(project.clientName, step.title), [], adminPath);
}

// Several files usually arrive together; one email per step per quarter of an hour is enough.
export async function notifyUpload(stepId: string) {
  if (await sentSince("studio.upload", stepId, new Date(Date.now() - 15 * 60_000))) return;
  const { step, project, adminPath } = await stepContext(stepId);
  await notifyStudio("upload", [step.id], e.studio.upload(project.clientName, step.title), [], adminPath);
}

export async function notifyNewRequest(requestId: string) {
  const { data: request } = await db().from("change_requests").select("id, title, urgency, project_id").eq("id", requestId).single();
  if (!request) return;
  const project = await projectInfo(request.project_id);
  const urgent = request.urgency === "urgent";
  await notifyStudio(
    urgent ? "urgent" : "request",
    [request.id],
    urgent ? e.studio.urgent(project.clientName, request.title) : e.studio.request(project.clientName, request.title),
    [],
    `/studio/change-requests/${request.id}`,
  );
}

// Above 80 % of the monthly allowance: once per agreement per month.
export async function checkHours(projectId: string) {
  const { data: agreement } = await db().from("maintenance_agreements").select("id").eq("project_id", projectId).eq("status", "active").maybeSingle();
  if (!agreement) return;
  const { data } = await db().rpc("agreement_usage", { p_agreement_id: agreement.id });
  const usage = data?.[0];
  if (!usage || usage.included_minutes === 0 || usage.used_minutes <= usage.included_minutes * 0.8) return;
  const kind = `hours80.${usage.month.slice(0, 7)}`;
  if (await sentSince(`studio.${kind}`, agreement.id)) return;
  const project = await projectInfo(projectId);
  await notifyStudio(
    kind,
    [agreement.id],
    e.studio.hours80(project.clientName, formatMinutes(usage.used_minutes), formatMinutes(usage.included_minutes)),
    [],
    `/studio/projects/${projectId}/maintenance`,
  );
}

// ---------------------------------------------------------------------------
// Daily job (Vercel Cron): reminders, renewals, hours
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60_000;

export async function runDailyJobs(now = new Date()) {
  const summary = { reminders: 0, renewals: 0, hoursChecked: 0 };
  const { data: settings } = await db().from("app_settings").select("reminder_after_days, reminder_interval_days").single();
  const afterDays = settings?.reminder_after_days ?? 5;
  const intervalDays = settings?.reminder_interval_days ?? 7;

  // Reminders: a client step waiting longer than afterDays, then at most every intervalDays.
  // One email per project, listing what waits, so a parallel phase doesn't become five emails.
  const { data: projects } = await db().from("projects").select("id").eq("status", "active").eq("reminders_enabled", true);
  for (const { id } of projects ?? []) {
    const overdue = (await clientTurnSteps(id)).filter((s) => s.since && now.getTime() - new Date(s.since).getTime() >= afterDays * DAY);
    if (overdue.length === 0) continue;
    if (await sentSince("reminder", id, new Date(now.getTime() - intervalDays * DAY))) continue;

    const project = await projectInfo(id);
    const days = Math.floor((now.getTime() - new Date(overdue[0].since!).getTime()) / DAY);
    const one = overdue.length === 1 ? overdue[0] : null;
    await deliver("reminder", [id], await clientEmails(project.client_id), one ? e.reminder.subject(one.title) : e.turn.subjectMany(overdue.length), {
      heading: e.reminder.heading,
      lines: one ? [e.reminder.body(one.title, days), e.reminder.help] : [e.turn.bodyMany(project.name), e.reminder.help],
      list: one ? undefined : overdue.map((s) => s.title),
      button: one ? { label: e.openStep, url: url(`/p/${id}/steg/${one.id}`) } : { label: e.openProject, url: url(`/p/${id}`) },
      footer: e.footerClient,
    });
    summary.reminders++;
  }

  // Renewals within 30 days: once per renewal date.
  const today = todayInOslo(now);
  const until = todayInOslo(new Date(now.getTime() + 30 * DAY));
  const { data: sites } = await db().from("site_details").select("project_id, domain_name, domain_renewal_date, hosting_provider, hosting_renewal_date");
  for (const site of sites ?? []) {
    for (const [kind, date, what] of [
      ["domain", site.domain_renewal_date, e.studio.renewalDomain(site.domain_name ?? "")],
      ["hosting", site.hosting_renewal_date, e.studio.renewalHosting(site.hosting_provider ?? "")],
    ] as const) {
      if (!date || date < today || date > until) continue;
      const key = `renewal.${kind}.${date}`;
      if (await sentSince(`studio.${key}`, site.project_id)) continue;
      const project = await projectInfo(site.project_id);
      await notifyStudio(key, [site.project_id], e.studio.renewal(what, formatDate(date), project.clientName), [], `/studio/projects/${site.project_id}/site`);
      summary.renewals++;
    }
  }

  const { data: agreements } = await db().from("maintenance_agreements").select("project_id").eq("status", "active");
  for (const a of agreements ?? []) {
    await checkHours(a.project_id);
    summary.hoursChecked++;
  }
  return summary;
}
