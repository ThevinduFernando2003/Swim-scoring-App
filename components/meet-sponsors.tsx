import type { MeetSponsor } from "@/lib/types";

export function MeetSponsors({
  sponsors,
  placement,
}: {
  sponsors: MeetSponsor[];
  placement: MeetSponsor["placement"];
}) {
  const rows = sponsors.filter((item) => item.placement === placement);
  if (rows.length === 0) return null;

  return (
    <div
      className={
        placement === "background"
          ? "pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-[0.07]"
          : "flex flex-wrap items-center justify-center gap-6 py-4"
      }
    >
      {rows.map((sponsor) => {
        const inner = sponsor.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sponsor.logo_url}
            alt={sponsor.name}
            className={
              placement === "background" ? "max-h-64 max-w-lg object-contain" : "max-h-10 object-contain"
            }
          />
        ) : (
          <span className="text-xs font-bold uppercase tracking-widest text-cream/50">
            {sponsor.name}
          </span>
        );
        if (sponsor.url && placement !== "background") {
          return (
            <a
              key={sponsor.id}
              href={sponsor.url}
              target="_blank"
              rel="noreferrer"
              className="opacity-80 hover:opacity-100"
            >
              {inner}
            </a>
          );
        }
        return <div key={sponsor.id}>{inner}</div>;
      })}
    </div>
  );
}
