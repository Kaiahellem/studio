"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui";
import { t } from "@/i18n/nb";

// Shown when a page fails. Focus moves to the heading so screen reader users hear what happened.
export function ErrorView({ error, reset, home }: { error: Error & { digest?: string }; reset: () => void; home: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    console.error(error);
    heading.current?.focus();
  }, [error]);

  return (
    <div role="alert" className="flex max-w-prose flex-col gap-6">
      <h1 ref={heading} tabIndex={-1} className="font-serif text-4xl tracking-tight">
        {t.common.errorTitle}
      </h1>
      <p className="text-lg leading-relaxed text-muted">{t.common.errorBody}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonClass.primary}>
          {t.common.tryAgain}
        </button>
        <Link href={home} className={buttonClass.secondary}>
          {t.common.toStart}
        </Link>
      </div>
    </div>
  );
}
