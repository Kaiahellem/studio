import { t } from "@/i18n/nb";

export default function Loading() {
  return (
    <p role="status" className="p-8 text-muted">
      {t.common.loading}
    </p>
  );
}
