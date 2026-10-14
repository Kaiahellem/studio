# Going to production

A checklist for the first deploy. Everything here is done once; later changes are a git push
(Vercel) and `supabase db push` (database).

## 1. Domain and email (Resend)

1. Register the business domain.
2. Create a Resend account, choose the **EU region**, add the domain and set the DNS records it
   shows (SPF, DKIM, and DMARC if offered). Wait until Resend says "Verified".
3. Create an API key with sending access only.

## 2. Supabase

1. Create a project in **eu-north-1 (Stockholm)**. Save the database password in your password manager.
2. Link and push the schema:
   ```sh
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <ref>
   pnpm exec supabase db push
   ```
3. Authentication settings (mirror `supabase/config.toml`):
   - Sign In / Providers → **Allow new users to sign up: off**. **Email provider: on**
     (turning it off disables login entirely).
   - Email → minimum interval between emails: **60 seconds**. OTP expiry: **3600**.
   - Multi-factor → **TOTP: enabled**.
   - URL configuration → Site URL `https://<your domain>`, redirect URLs `https://<your domain>/**`.
   - Email templates → **Magic link**: subject "Logg inn i kundeportalen", body from
     `supabase/templates/magic_link.html`.
   - SMTP → custom SMTP with Resend: host `smtp.resend.com`, port `465`, user `resend`,
     password = the Resend API key, sender = your `EMAIL_FROM` address.
4. Storage: the `project-files` bucket is created by the migrations. Nothing to do.

## 3. Vercel

1. Import the GitHub repository. Framework: Next.js. Region: `arn1` (set in `vercel.json`).
2. Environment variables (Production):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://<your domain>` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_SECRET_KEY` | Secret key (never `NEXT_PUBLIC_`) |
   | `RESEND_API_KEY` | From step 1 |
   | `EMAIL_FROM` | e.g. `Studio <hei@ditt-domene.no>` |
   | `CRON_SECRET` | `openssl rand -hex 24` |
   | `PAGESPEED_API_KEY` | Optional, for website analysis. Google Cloud → APIs & Services → enable "PageSpeed Insights API" → Credentials → API key, restricted to that API. Works without a key at low volume. |

   Do **not** set `MAILPIT_URL` or `ANALYSIS_FAKES` in production.
3. Add your domain in Vercel and point DNS to it.
4. The daily job (`vercel.json` → `/api/cron/daily`, 06:00 UTC) starts automatically.

## 4. First admin

```sh
# .env.production.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (never commit it)
node --experimental-strip-types --env-file=.env.production.local scripts/make-admin.mts you@example.com --confirm <ref>.supabase.co
```

Log in at `https://<your domain>/logg-inn`. The first login asks you to set up an
authenticator app; add a second one (e.g. 1Password) as a backup.

## 5. Before the first real client

- Replace the placeholder on `/personvern` (`src/i18n/nb.ts` → `privacy`) with your privacy notice. It includes a draft
  sentence about website analysis with Claude; keep it in some form if you use analyses.
- Website analysis in manual mode uses your Claude subscription: turn off "Help improve Claude" in Claude's settings.
- Adjust the maintenance plan (Studio → Planer) and upload limits (Studio → Innstillinger).
- Send yourself a test invitation from a test client, log in on your phone, and walk one step.
- Supabase free projects pause after a week without activity; upgrade to Pro once clients rely on it.
