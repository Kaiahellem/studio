import "server-only";
import { z } from "zod";

// Server-side environment. Public values are read in ./public-env.ts so they can be inlined.
const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  // Local development only: deliver notification emails to Mailpit instead of Resend.
  MAILPIT_URL: z.url().optional(),
});

let cached: z.infer<typeof serverEnvSchema> | undefined;

export function serverEnv() {
  cached ??= serverEnvSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    MAILPIT_URL: process.env.MAILPIT_URL || undefined,
  });
  return cached;
}
