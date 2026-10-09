import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";

export type Email = { to: string[]; subject: string; html: string; text: string };

const DEFAULT_FROM = "Studio <hei@localhost>";

function parseFrom(from: string) {
  const match = from.match(/^(.*)<(.+)>$/);
  return match ? { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() } : { name: "", email: from };
}

// Resend in production. Locally, without a Resend key, mail goes to Mailpit so it can be read
// at http://127.0.0.1:54324 like the login emails. Returns a provider id, or null if not sent.
export async function sendEmail(email: Email): Promise<string | null> {
  const env = serverEnv();
  const from = env.EMAIL_FROM ?? DEFAULT_FROM;
  if (email.to.length === 0) return null;

  if (env.RESEND_API_KEY) {
    const resend = new Resend(env.RESEND_API_KEY);
    // One message per recipient, so clients never see each other's addresses.
    const results = await Promise.all(
      email.to.map((to) => resend.emails.send({ from, to, subject: email.subject, html: email.html, text: email.text })),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(`Resend: ${failed.error.message}`);
    return results[0]?.data?.id ?? null;
  }

  if (env.MAILPIT_URL) {
    const sender = parseFrom(from);
    for (const to of email.to) {
      const response = await fetch(`${env.MAILPIT_URL}/api/v1/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          From: { Email: sender.email, Name: sender.name },
          To: [{ Email: to }],
          Subject: email.subject,
          HTML: email.html,
          Text: email.text,
        }),
      });
      if (!response.ok) throw new Error(`Mailpit: ${response.status}`);
    }
    return "mailpit";
  }

  console.info(`[email not sent: no RESEND_API_KEY or MAILPIT_URL] ${email.subject} → ${email.to.join(", ")}`);
  return null;
}
