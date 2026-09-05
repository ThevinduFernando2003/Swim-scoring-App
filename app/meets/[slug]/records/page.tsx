import { notFound } from "next/navigation";
import { loadMeetBySlug, loadMeetRecords } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PublicRecordsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();
  const records = await loadMeetRecords(supabase, meet.id, meet.championship_id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          All-time bests
        </p>
        <h1 className="text-3xl font-black text-cream sm:text-5xl">Meet records</h1>
        <p className="mt-2 max-w-2xl text-cream/70">
          Current championship records. A new result faster than these is marked
          NMR on the event page.
        </p>
      </div>
      {records.length === 0 ? (
        <p className="rounded-xl border border-gold/20 bg-navy-mid p-8 text-cream/70">
          No records have been seeded for this meet yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gold/20">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-light text-xs uppercase tracking-widest text-gold">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Holder</th>
                <th className="px-4 py-3">Year</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-t border-white/10 bg-navy-mid/60">
                  <td className="px-4 py-3 font-semibold text-cream">
                    {record.event_name} · {record.gender}
                  </td>
                  <td className="px-4 py-3 font-mono text-gold">{record.time_text}</td>
                  <td className="px-4 py-3 text-cream">
                    {record.swimmer_name}
                    {record.team_code ? ` (${record.team_code})` : ""}
                  </td>
                  <td className="px-4 py-3 text-cream/70">{record.year ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
