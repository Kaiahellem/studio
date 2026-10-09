import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

// Buttons (DESIGN.md, Components). 36px tall, 44px on mobile; 4px radius; at most one
// primary per view. Destructive actions always go through a confirmation dialog.
export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 text-[15px] font-medium leading-tight transition-colors duration-[120ms] ease-out disabled:cursor-not-allowed disabled:opacity-60 md:min-h-9";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: `${base} bg-primary-bg text-primary-text hover:bg-primary-bg-hover`,
  secondary: `${base} border border-control-border bg-transparent text-ink hover:bg-subtle`,
  ghost: `${base} text-ink-secondary hover:bg-subtle hover:text-ink`,
  destructive: `${base} border border-control-border bg-transparent text-brick-fg hover:bg-brick-bg`,
};

type Common = { variant?: ButtonVariant; children: ReactNode; className?: string };

export function Button({ variant = "secondary", className = "", type = "button", ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`${buttonVariants[variant]} ${className}`} {...rest} />;
}

export function ButtonLink({
  variant = "secondary",
  className = "",
  href,
  external,
  ...rest
}: Common & { href: string; external?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={`${buttonVariants[variant]} ${className}`} {...rest} />;
  }
  return <Link href={href} className={`${buttonVariants[variant]} ${className}`} {...rest} />;
}
