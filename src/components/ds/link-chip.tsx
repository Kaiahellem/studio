import { ExternalLink } from "lucide-react";
import { t } from "@/i18n/nb";
import { Icon } from "./icon";

// Review and preview links: --inset background, 8px radius, external-link icon and a label.
export function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-2 rounded-nav bg-inset px-3 text-label text-ink transition-colors duration-[120ms] hover:bg-hover md:min-h-8"
    >
      {label}
      <Icon icon={ExternalLink} className="text-ink-secondary" />
      <span className="sr-only">{t.client.newTab}</span>
    </a>
  );
}
