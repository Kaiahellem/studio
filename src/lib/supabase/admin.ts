import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/public-env";

// Bypasses RLS. Only for cron, invites, export/delete and seeding (docs/PLAN.md §1).
// Always check the caller's role before using it.
export function createAdminClient() {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
