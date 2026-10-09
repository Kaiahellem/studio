import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAdminAccount, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";

// Milestone 1 placeholder: lists the client's projects via RLS. The real hub is milestone 3.
async function Projects() {
  await requireUser("/");
  if (await isAdminAccount()) redirect("/studio");

  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, clients(name)")
    .order("created_at");
  if (error) throw error;

  if (projects.length === 0) return <p className="text-muted">{t.client.noProjects}</p>;

  return (
    <ul className="divide-y divide-line border-y border-line">
      {projects.map((p) => (
        <li key={p.id} className="py-4">
          <p className="text-lg">{p.name}</p>
        </li>
      ))}
    </ul>
  );
}

export default function ClientHome() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-4xl tracking-tight">{t.client.projectsTitle}</h1>
      <Suspense fallback={<p className="text-muted">{t.common.loading}</p>}>
        <Projects />
      </Suspense>
    </div>
  );
}
