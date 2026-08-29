import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const supabase = await createClient();
  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, event_id, file_path, uploaded_by, uploaded_at, confirmed, events(name, day, event_number, gender)")
    .order("uploaded_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm font-semibold text-gold">
        ← Dashboard
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Paper trail
        </p>
        <h1 className="text-3xl font-black text-cream">Audit log</h1>
      </div>

      <div className="overflow-hidden rounded-xl border border-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy-light text-xs uppercase tracking-widest text-gold">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">PDF</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(uploads ?? []).map((upload) => {
              const event = Array.isArray(upload.events)
                ? upload.events[0]
                : upload.events;
              const { data } = supabase.storage
                .from("result-pdfs")
                .getPublicUrl(upload.file_path);
              const isPdf = upload.file_path.endsWith(".pdf");
              return (
                <tr key={upload.id} className="border-t border-white/10">
                  <td className="px-4 py-3 text-cream/80">
                    {new Date(upload.uploaded_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {event ? (
                      <Link
                        href={`/admin/events/${upload.event_id}`}
                        className="text-cream hover:text-gold"
                      >
                        Day {event.day} Event {event.event_number} {event.gender}{" "}
                        {event.name}
                      </Link>
                    ) : (
                      upload.event_id
                    )}
                  </td>
                  <td className="px-4 py-3 text-cream/80">
                    {upload.uploaded_by ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {isPdf ? (
                      <a
                        href={data.publicUrl}
                        className="font-semibold text-gold"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Original PDF
                      </a>
                    ) : (
                      <span className="text-cream/50">{upload.file_path}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {upload.confirmed ? "Confirmed" : "Draft"}
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
