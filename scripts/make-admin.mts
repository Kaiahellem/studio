// Makes an email address an admin (creating the user if needed). The one script meant for
// production, so it asks for explicit confirmation of the target.
//
//   node --experimental-strip-types --env-file=.env.production.local scripts/make-admin.mts you@example.com --confirm <supabase-host>

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

const [email, flag, confirmHost] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!email || !url || !key) {
  console.error("Usage: make-admin.mts <email> --confirm <supabase-host>  (env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY)");
  process.exit(1);
}
const host = new URL(url).host;
if (flag !== "--confirm" || confirmHost !== host) {
  console.error(`Refusing to run without "--confirm ${host}". This changes who can see every client.`);
  process.exit(1);
}

const db = createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const normalized = email.trim().toLowerCase();

let userId = (await db.auth.admin.createUser({ email: normalized, email_confirm: true })).data.user?.id;
for (let page = 1; !userId; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  userId = data.users.find((u) => u.email === normalized)?.id;
  if (data.users.length < 200) break;
}
if (!userId) throw new Error(`Could not create or find ${normalized}`);

const { error } = await db.from("admins").upsert({ user_id: userId });
if (error) throw error;
console.log(`${normalized} is now an admin on ${host}. Log in at /logg-inn and set up TOTP on first login.`);
