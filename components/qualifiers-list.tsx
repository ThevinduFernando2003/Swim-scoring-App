import type { QualifierRow } from "@/lib/qualify";

export function QualifiersList({
  rows,
  participantLabel,
}: {
  rows: QualifierRow[];
  participantLabel: string;
}) {
  const qualified = rows.filter((row) => row.band === "qualified");
  const reserves = rows.filter((row) => row.band === "reserve");
  if (qualified.length === 0) return null;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-gold/20">
        <div className="bg-navy-light px-4 py-2 text-xs font-bold uppercase tracking-widest text-gold">
          Qualified for the evening final
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-cream/50">
            <tr>
              <th className="px-4 py-2">Place</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">{participantLabel}</th>
              <th className="px-4 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {qualified.map((row) => (
              <tr key={`${row.swimmer_name}-${row.place}`} className="border-t border-white/10">
                <td className="px-4 py-2 font-mono text-gold">{row.place}</td>
                <td className="px-4 py-2 font-semibold text-cream">{row.swimmer_name}</td>
                <td className="px-4 py-2 text-cream/80">{row.team_code}</td>
                <td className="px-4 py-2 font-mono text-cream">{row.achievement}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {reserves.length > 0 ? (
        <p className="text-sm text-cream/70">
          Reserves:{" "}
          {reserves
            .map((row) => `${row.swimmer_name} (${row.team_code}, ${row.achievement})`)
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
