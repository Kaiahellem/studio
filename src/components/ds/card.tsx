import type { ElementType, ReactNode } from "react";

// Cards float: no border, a soft layered shadow (DESIGN.md, Elevation). In dark mode, where
// shadows barely show, --card-edge adds the one permitted 1px edge.
export type Level = "card" | "raised" | "overlay";

const shadow: Record<Level, string> = { card: "shadow-card", raised: "shadow-raised", overlay: "shadow-overlay" };

export function cardClass(level: Level = "card", padded = true) {
  return `rounded-card bg-card ${shadow[level]} ring-1 ring-card-edge ${padded ? "p-4 md:p-5" : ""}`;
}

export function Card({
  level = "card",
  padded = true,
  as: Tag = "div",
  className = "",
  children,
  ...rest
}: {
  level?: Level;
  padded?: boolean;
  as?: ElementType;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <Tag className={`${cardClass(level, padded)} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

// Grey area inside a card: groups content by tone, never with lines or nested shadows.
export function Inset({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-inset bg-inset p-4 ${className}`}>{children}</div>;
}
