"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PdfImportPanel } from "@/components/pdf-import-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EventType, Gender, ImportedEvent, Meet, MeetEvent } from "@/lib/types";
import { EVENT_TYPES, GENDERS } from "@/lib/types";

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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
  const [nextAt, setNextAt] = useState(toDatetimeLocal(meet.next_results_at));
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

      <div className="flex flex-col gap-3 rounded-xl border border-gold/20 bg-navy-mid p-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 space-y-1 text-sm">
          <span className="text-cream/70">Next results expected at</span>
          <Input
            type="datetime-local"
            value={nextAt}
            onChange={(e) => setNextAt(e.target.value)}
          />
          <p className="text-xs text-cream/50">
            Shown on the public leaderboard so people know when to check back.
          </p>
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() =>
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                const response = await fetch(`/api/meets/${meet.slug}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    next_results_at: nextAt ? new Date(nextAt).toISOString() : null,
                  }),
                });
                const json = await response.json();
                if (!response.ok) throw new Error(json.error || "Save failed");
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Save failed");
              } finally {
                setBusy(false);
              }
            })()
          }
        >
          Save time
        </Button>
      </div>

      <PdfImportPanel<{ events: ImportedEvent[] }>
        slug={meet.slug}
        kind="schedule"
        title="Import full programme from PDF"
        description="Drop the official schedule. Review events, then apply. Confirmed events are left alone; new events are added."
        applyLabel="Update schedule"
        onApply={async (payload) => {
          const response = await fetch(`/api/meets/${meet.slug}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "bulk_upsert", events: payload.events }),
          });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || "Import failed");
          router.refresh();
          return `Added ${json.created ?? 0}, updated ${json.updated ?? 0}, skipped confirmed ${json.skipped ?? 0}.`;
        }}
      >
        {(payload, setPayload) => (
          <div className="max-h-72 space-y-2 overflow-auto">
            <p className="text-sm text-cream/70">
              {payload.events?.length ?? 0} events ready to apply.
            </p>
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-gold">
                <tr>
                  <th className="py-1">Day</th>
                  <th className="py-1">No.</th>
                  <th className="py-1">Name</th>
                  <th className="py-1">Gender</th>
                </tr>
              </thead>
              <tbody>
                {(payload.events ?? []).map((row, index) => (
                  <tr key={index} className="border-t border-white/10">
                    <td className="py-1 pr-2">
                      <Input
                        type="number"
                        value={row.day}
                        onChange={(e) => {
                          const events = [...payload.events];
                          events[index] = { ...row, day: Number(e.target.value) || 1 };
                          setPayload({ events });
                        }}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        type="number"
                        value={row.event_number}
                        onChange={(e) => {
                          const events = [...payload.events];
                          events[index] = {
                            ...row,
                            event_number: Number(e.target.value) || 1,
                          };
                          setPayload({ events });
                        }}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        value={row.name}
                        onChange={(e) => {
                          const events = [...payload.events];
                          events[index] = { ...row, name: e.target.value };
                          setPayload({ events });
                        }}
                      />
                    </td>
                    <td className="py-1">
                      <select
                        value={row.gender}
                        onChange={(e) => {
                          const events = [...payload.events];
                          events[index] = {
                            ...row,
                            gender: e.target.value as Gender,
                          };
                          setPayload({ events });
                        }}
                        className="h-10 w-full rounded-md border border-white/20 bg-navy px-2 text-cream"
                      >
                        {GENDERS.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PdfImportPanel>

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
