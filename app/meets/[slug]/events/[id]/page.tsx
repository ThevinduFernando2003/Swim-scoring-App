import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadCsvButton } from "@/components/download-csv-button";
import { TeamBadge } from "@/components/team-badge";
import { loadMeetBySlug } from "@/lib/data";
import { formatPlace, tiedPositions } from "@/lib/ties";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const eventId = Number(id);
  if (!Number.isFinite(eventId)) notFound();

  const supabase = await createClient();
  const meet = await loadMeetBySlug(supabase, slug);
  if (!meet) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, meet_id, day, event_number, name, gender, event_type, status")
    .eq("id", eventId)
    .eq("meet_id", meet.id)
    .single();

  if (!event || event.status !== "confirmed") notFound();

  const { data: results } = await supabase
    .from("event_results")
    .select(
      "position, swimmer_name, achievement, points_awarded, result_status, teams(code, name)",
    )
    .eq("event_id", eventId)
    .order("position");

  const { data: upload } = await supabase
    .from("uploads")
    .select("file_path, confirmed")
    .eq("event_id", eventId)
    .eq("confirmed", true)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let pdfUrl: string | null = null;
  if (upload?.file_path?.endsWith(".pdf")) {
    if (meet.pdfs_public) {
      pdfUrl = supabase.storage.from("result-pdfs").getPublicUrl(upload.file_path)
        .data.publicUrl;
    } else {
      try {
        const admin = createAdminClient();
        const signed = await admin.storage
          .from("result-pdfs")
          .createSignedUrl(upload.file_path, 3600);
        pdfUrl = signed.data?.signedUrl ?? null;
      } catch {
        pdfUrl = null;
      }
    }
  }

  const medals = ["🥇", "🥈", "🥉"];
  const rows = results ?? [];
  const ties = tiedPositions(rows);

  return (
    <div className="space-y-6">
      <Link
        href={`/meets/${meet.slug}/schedule`}
        className="text-sm font-semibold text-gold"
      >
        ← Schedule
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
            Day {event.day} · Event {event.event_number} · {event.gender}
          </p>
          <h1 className="text-3xl font-black text-cream sm:text-4xl">
            {event.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-gold px-3 py-2 text-sm font-bold text-navy"
            >
              View original PDF
            </a>
          ) : null}
          <DownloadCsvButton
            filename={`${meet.slug}-event-${event.event_number}.csv`}
            label="Download event result (CSV)"
            rows={[
              ["Pos", "Name", meet.participant_label, "Time", "Status", "Points"],
              ...rows.map((row) => {
                const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
                return [
                  formatPlace(row.position, row.position != null && ties.has(row.position)),
                  row.swimmer_name,
                  team?.code ?? "",
                  row.achievement,
                  row.result_status,
                  row.points_awarded,
                ];
              }),
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gold/20">
        <table className="w-full text-left">
          <thead className="bg-navy-light text-xs uppercase tracking-widest text-gold">
            <tr>
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">{meet.participant_label}</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
              const medal =
                row.result_status === "finished" &&
                row.position &&
                row.position <= 3
                  ? medals[row.position - 1]
                  : "";
              return (
                <tr
                  key={`${index}-${row.swimmer_name}`}
                  className="border-t border-white/10 bg-navy-mid/60"
                >
                  <td className="px-4 py-4 font-mono text-xl font-black text-gold">
                    {medal}{" "}
                    {row.position != null
                      ? formatPlace(row.position, ties.has(row.position))
                      : row.result_status}
                  </td>
                  <td className="px-4 py-4 font-semibold text-cream">
                    {row.swimmer_name}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <TeamBadge code={team?.code ?? "—"} />
                      <span className="hidden text-sm text-cream/70 sm:inline">
                        {team?.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-cream">
                    {row.achievement}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xl font-black text-cream">
                    {row.points_awarded}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
