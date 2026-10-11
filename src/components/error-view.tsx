"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { buttonVariants } from "@/components/ds/button";
import { cardClass } from "@/components/ds/card";
import { t } from "@/i18n/nb";

// Shown when a page fails. Focus moves to the heading so screen reader users hear what happened.
export function ErrorView({ error, reset, home }: { error: Error & { digest?: string }; reset: () => void; home: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    console.error(error);
    heading.current?.focus();
  }, [error]);

  return (
    <div role="alert" className="flex flex-col gap-6">
      <h1 ref={heading} tabIndex={-1} className="text-title-xl">
        {t.common.errorTitle}
      </h1>
      <div className={`flex flex-col gap-4 ${cardClass("card")}`}>
      <p className="text-body">{t.common.errorBody}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonVariants.primary}>
          {t.common.tryAgain}
        </button>
        <Link href={home} className={buttonVariants.secondary}>
          {t.common.toStart}
        </Link>
      </div>
      </div>
    </div>
  );
}
