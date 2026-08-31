"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EventType, Gender, Meet, MeetEvent } from "@/lib/types";
import { EVENT_TYPES, GENDERS } from "@/lib/types";

export function ScheduleEditor({
  meet,
  events,
}: {
  meet: Meet;
  events: MeetEvent[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    day: 1,
    event_number: (events.at(-1)?.event_number ?? 0) + 1,
    name: "",
    gender: "Men" as Gender,
    event_type: "individual" as EventType,
  });

  async function request(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/meets/${meet.slug}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Request failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Programme
        </p>
        <h1 className="text-3xl font-black text-cream">Schedule editor</h1>
      </div>

      <form
        className="grid gap-3 rounded-xl border border-gold/20 bg-navy-mid p-4 sm:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          void request({ action: "create", ...draft });
        }}
      >
        <label className="space-y-1 text-sm">
          <span className="text-cream/70">Day</span>
          <Input
            type="number"
            min={1}
            value={draft.day}
            onChange={(e) =>
              setDraft((current) => ({ ...current, day: Number(e.target.value) }))
            }
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-cream/70">No.</span>
          <Input
            type="number"
            min={1}
            value={draft.event_number}
            onChange={(e) =>
              setDraft((current) => ({
                ...current,
                event_number: Number(e.target.value),
              }))
            }
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-cream/70">Name</span>
          <Input
            value={draft.name}
            onChange={(e) =>
              setDraft((current) => ({ ...current, name: e.target.value }))
            }
            required
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-cream/70">Gender</span>
          <select
            value={draft.gender}
            onChange={(e) =>
              setDraft((current) => ({
                ...current,
                gender: e.target.value as Gender,
              }))
            }
            className="h-10 w-full rounded-md border border-white/20 bg-navy px-2 text-cream"
          >
            {GENDERS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-cream/70">Type</span>
          <select
            value={draft.event_type}
            onChange={(e) =>
              setDraft((current) => ({
                ...current,
                event_type: e.target.value as EventType,
              }))
            }
            className="h-10 w-full rounded-md border border-white/20 bg-navy px-2 text-cream"
          >
            {EVENT_TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-6">
          <Button type="submit" disabled={busy}>
            Add event
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <ul className="space-y-2">
        {events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            busy={busy}
            onSave={(patch) =>
              void request({ action: "update", id: event.id, ...patch })
            }
            onDelete={() => void request({ action: "delete", id: event.id })}
          />
        ))}
      </ul>
    </div>
  );
}

function EventRow({
  event,
  busy,
  onSave,
  onDelete,
}: {
  event: MeetEvent;
  busy: boolean;
  onSave: (patch: Partial<MeetEvent>) => void;
  onDelete: () => void;
}) {
  const locked = event.status === "confirmed";
  const [day, setDay] = useState(event.day);
  const [eventNumber, setEventNumber] = useState(event.event_number);
  const [name, setName] = useState(event.name);
  const [gender, setGender] = useState(event.gender);
  const [eventType, setEventType] = useState(event.event_type);

  return (
    <li className="space-y-2 rounded-xl border border-gold/20 bg-navy-mid p-3">
      <div className="grid gap-2 sm:grid-cols-6">
        <Input
          type="number"
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
        />
        <Input
          type="number"
          value={eventNumber}
          onChange={(e) => setEventNumber(Number(e.target.value))}
        />
        <Input
          className="sm:col-span-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          value={gender}
          disabled={locked}
          onChange={(e) => setGender(e.target.value as Gender)}
          className="h-10 rounded-md border border-white/20 bg-navy px-2 text-cream disabled:opacity-60"
        >
          {GENDERS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={eventType}
          disabled={locked}
          onChange={(e) => setEventType(e.target.value as EventType)}
          className="h-10 rounded-md border border-white/20 bg-navy px-2 text-cream disabled:opacity-60"
        >
          {EVENT_TYPES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      {locked ? (
        <p className="text-xs text-cream/50">
          Gender and event type are locked because this event has confirmed results.
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() =>
            onSave({
              day,
              event_number: eventNumber,
              name,
              gender,
              event_type: eventType,
            })
          }
        >
          Save
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={busy || locked}
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}
