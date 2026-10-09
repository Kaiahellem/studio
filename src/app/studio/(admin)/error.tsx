"use client";

import { ErrorView } from "@/components/error-view";

export default function StudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} home="/studio" />;
}
