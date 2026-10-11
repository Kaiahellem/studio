import { t } from "@/i18n/nb";

export default function Loading() {
  return (
    <p role="status" className="p-8 text-ink-secondary">
      {t.common.loading}
    </p>
  );
}
