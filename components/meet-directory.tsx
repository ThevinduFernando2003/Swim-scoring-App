import Link from "next/link";
import { MeetStatusBadge } from "@/components/meet-status-badge";
import type { Meet } from "@/lib/types";

export function MeetDirectory({
  meets,
  emptyLabel = "No meets are live yet.",
}: {
  meets: Meet[];
  emptyLabel?: string;
}) {
  if (meets.length === 0) {
    return (
      <p className="rounded-xl border border-gold/20 bg-navy-mid p-8 text-cream/70">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {meets.map((meet) => (
        <li key={meet.id}>
          <Link
            href={`/meets/${meet.slug}`}
            className="block rounded-xl border border-gold/20 bg-navy-mid p-5 transition hover:border-gold/50"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">
                {meet.participant_label}
              </p>
              <MeetStatusBadge status={meet.status} />
            </div>
            <h2 className="mt-2 text-xl font-black text-cream">{meet.name}</h2>
            <p className="mt-3 text-sm font-semibold text-gold">Open leaderboard →</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
