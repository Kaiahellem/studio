import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/nb";

export const metadata: Metadata = { title: t.studio.dashboardTitle };

// Milestone 1 placeholder: proves admin access works end to end. The real dashboard is milestone 2.
export default async function StudioDashboard() {
  const supabase = await createClient();
  const { data: clients, error } = await supabase.from("clients").select("id, name").order("name");
  if (error) throw error;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-4xl tracking-tight">{t.studio.dashboardTitle}</h1>
      <section aria-labelledby="clients-heading">
        <h2 id="clients-heading" className="mb-3 font-serif text-2xl">
          {t.studio.nav.clients}
        </h2>
        <ul className="divide-y divide-line border-y border-line">
          {clients.map((c) => (
            <li key={c.id} className="py-3">
              {c.name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
