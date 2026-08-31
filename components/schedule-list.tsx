"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import type { MeetEvent } from "@/lib/types";

export function ScheduleList({
  events,
  slug,
}: {
  events: MeetEvent[];
  slug: string;
}) {
  const days = useMemo(
    () => [...new Set(events.map((event) => event.day))].sort((a, b) => a - b),
    [events],
  );
  const [day, setDay] = useState<number>(days[0] ?? 1);
  const visible = useMemo(
    () => events.filter((event) => event.day === day),
    [day, events],
  );

  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-gold/20 bg-navy-mid p-8 text-cream/70">
        No events have been added to this meet yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Programme
        </p>
        <h1 className="text-3xl font-black tracking-tight text-cream sm:text-5xl">
          Schedule
        </h1>
      </div>

      {days.length > 1 ? (
        <div className="flex rounded-lg border border-gold/30 bg-navy-mid p-1">
          {days.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setDay(item)}
              className={`flex-1 rounded-md px-3 py-2.5 text-sm font-bold uppercase tracking-wide ${
                day === item ? "bg-gold text-navy" : "text-cream/70 hover:text-cream"
              }`}
            >
              Day {item}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm font-bold uppercase tracking-widest text-gold">
          Day {days[0]}
        </p>
      )}

      <ol className="space-y-2">
        {visible.map((event) => {
          const inner = (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/20 bg-navy-mid p-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-gold">
                  Event {event.event_number} · {event.gender} · {event.event_type}
                </p>
                <p className="truncate text-lg font-semibold text-cream">
                  {event.name}
                </p>
              </div>
              <StatusPill status={event.status} publicView />
            </div>
          );

          if (event.status === "confirmed") {
            return (
              <li key={event.id}>
                <Link href={`/meets/${slug}/events/${event.id}`}>{inner}</Link>
              </li>
            );
          }

          return <li key={event.id}>{inner}</li>;
        })}
      </ol>
    </div>
  );
}
