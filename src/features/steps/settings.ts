import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

// Upload limits from app_settings. The table is admin-only through RLS, but the limits
// themselves aren't secret: clients need them to know what they may upload.
export const getUploadSettings = cache(async () => {
  const { data, error } = await createAdminClient()
    .from("app_settings")
    .select("max_upload_bytes, allowed_mime_types")
    .single();
  if (error) throw error;
  return { maxBytes: data.max_upload_bytes, allowedTypes: data.allowed_mime_types };
});
