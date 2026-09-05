"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Gender, Meet, MeetRecord } from "@/lib/types";
import { EVENT_TYPES, GENDERS } from "@/lib/types";

export function RecordsEditor({
  meet,
  records,
}: {
  meet: Meet;
  records: MeetRecord[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    event_name: "",
    gender: "Men" as Gender,
    event_type: "individual" as "individual" | "relay",
    time_text: "",
    swimmer_name: "",
    team_code: "",
    year: "",
  });

  async function request(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/meets/${meet.slug}/records`, {
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
          History
        </p>
        <h1 className="text-3xl font-black text-cream">Meet records</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream/70">
          Seed last year’s best times. When a published result is faster, it is
          marked NMR and this list updates.
        </p>
      </div>

      <form
        className="grid gap-3 rounded-xl border border-gold/20 bg-navy-mid p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void request({
            action: "create",
            ...draft,
            year: draft.year ? Number(draft.year) : null,
            team_code: draft.team_code || null,
          });
        }}
      >
        <Input
          required
          placeholder="100m Freestyle"
          value={draft.event_name}
          onChange={(e) => setDraft((c) => ({ ...c, event_name: e.target.value }))}
        />
        <Input
          required
          placeholder="Time 00:52.10"
          value={draft.time_text}
          onChange={(e) => setDraft((c) => ({ ...c, time_text: e.target.value }))}
        />
        <Input
          required
          placeholder="Record holder"
          value={draft.swimmer_name}
          onChange={(e) => setDraft((c) => ({ ...c, swimmer_name: e.target.value }))}
        />
        <Input
          placeholder="Team code"
          value={draft.team_code}
          onChange={(e) => setDraft((c) => ({ ...c, team_code: e.target.value.toUpperCase() }))}
        />
        <select
          value={draft.gender}
          onChange={(e) => setDraft((c) => ({ ...c, gender: e.target.value as Gender }))}
          className="h-10 rounded-md border border-white/20 bg-navy px-2 text-cream"
        >
          {GENDERS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={draft.event_type}
          onChange={(e) =>
            setDraft((c) => ({ ...c, event_type: e.target.value as "individual" | "relay" }))
          }
          className="h-10 rounded-md border border-white/20 bg-navy px-2 text-cream"
        >
          {EVENT_TYPES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <Input
          placeholder="Year set (e.g. 2025)"
          value={draft.year}
          onChange={(e) => setDraft((c) => ({ ...c, year: e.target.value }))}
        />
        <Button type="submit" disabled={busy}>
          Add record
        </Button>
      </form>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <ul className="space-y-2">
        {records.map((record) => (
          <li
            key={record.id}
            className="flex flex-col gap-2 rounded-xl border border-gold/20 bg-navy-mid px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-cream">
                {record.event_name} · {record.gender}
              </p>
              <p className="text-sm text-cream/70">
                {record.time_text} · {record.swimmer_name}
                {record.team_code ? ` (${record.team_code})` : ""}
                {record.year ? ` · ${record.year}` : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => void request({ action: "delete", id: record.id })}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
