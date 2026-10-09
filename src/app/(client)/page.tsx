import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyProjects } from "@/features/hub/queries";
import { t } from "@/i18n/nb";

const c = t.client;

export const metadata: Metadata = { title: c.projectsTitle };

// One project (the usual case) goes straight to it; several get a short list.
export default async function ClientHome() {
  const { projects, firstName } = await getMyProjects();
  if (projects.length === 1) redirect(`/p/${projects[0].id}`);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="mb-2 text-muted">{c.greeting(firstName)}</p>
        <h1 className="font-serif text-4xl tracking-tight">{c.projectsTitle}</h1>
      </header>
      {projects.length === 0 ? (
        <p className="text-muted">{c.noProjects}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/p/${p.id}`} className="flex flex-col gap-1 py-5 hover:bg-surface/60">
                <span className="text-lg font-medium">{p.name}</span>
                <span className="text-sm text-muted">{p.clients?.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
