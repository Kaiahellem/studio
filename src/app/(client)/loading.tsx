import { t } from "@/i18n/nb";

// Suspense boundary for client pages, which read the session at request time.
export default function Loading() {
  return (
    <p role="status" className="text-ink-secondary">
      {t.common.loading}
    </p>
  );
}
