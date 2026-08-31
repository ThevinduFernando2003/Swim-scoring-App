"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import type { EventStatus, Meet, MeetEvent } from "@/lib/types";

const FILTERS: { id: "all" | EventStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "not_uploaded", label: "Not uploaded" },
  { id: "pending_review", label: "Pending review" },
  { id: "confirmed", label: "Confirmed" },
];

export function AdminEventList({
  meet,
  events,
}: {
  meet: Meet;
  events: MeetEvent[];
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const visible = useMemo(
    () =>
      events.filter((event) => (filter === "all" ? true : event.status === filter)),
    [events, filter],
  );
  const days = useMemo(
    () => [...new Set(events.map((event) => event.day))].sort((a, b) => a - b),
    [events],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
            Scoring desk
          </p>
          <h1 className="text-3xl font-black text-cream">Uploads</h1>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-md px-3 py-2 text-sm font-semibold text-cream/70 hover:text-cream"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              filter === item.id
                ? "bg-gold text-navy"
                : "bg-white/10 text-cream/70"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-gold/20 bg-navy-mid p-6 text-cream/70">
          Add events in the schedule editor before uploading results.
        </p>
      ) : null}

      {days.map((day) => (
        <section key={day} className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gold">
            Day {day}
          </h2>
          {visible
            .filter((event) => event.day === day)
            .map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-xl border border-gold/20 bg-navy-mid p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs uppercase tracking-widest text-cream/60">
                    Event {event.event_number} · {event.gender} · {event.event_type}
                  </p>
                  <p className="text-lg font-semibold text-cream">{event.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={event.status} />
                  <Link
                    href={`/meets/${meet.slug}/admin/events/${event.id}`}
                    className="rounded-md bg-gold px-3 py-2 text-sm font-bold text-navy"
                  >
                    {event.status === "not_uploaded"
                      ? "Upload result"
                      : event.status === "pending_review"
                        ? "Review"
                        : "Correct / replace"}
                  </Link>
                </div>
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
