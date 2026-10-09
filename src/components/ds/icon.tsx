import type { LucideIcon, LucideProps } from "lucide-react";

// Lucide at 16px with a 1.5 stroke (DESIGN.md, Icons). Decorative by default: icons support
// text and never replace it, so they are hidden from assistive tech unless given a label.
export function Icon({ icon: Glyph, label, className = "", ...rest }: { icon: LucideIcon; label?: string } & LucideProps) {
  return (
    <Glyph
      size={16}
      strokeWidth={1.5}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={`shrink-0 ${className}`}
      {...rest}
    />
  );
}
