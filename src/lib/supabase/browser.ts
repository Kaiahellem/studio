import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";
import { publicEnv } from "@/lib/public-env";

// Used only to upload straight to Storage with a signed URL the server created.
export function createClient() {
  return createBrowserClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
