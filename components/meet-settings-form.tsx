"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parsePointsConfig, withMaxPlaces } from "@/lib/points";
import type { Meet, MeetStatus, PointsConfig } from "@/lib/types";
import { MEET_STATUSES } from "@/lib/types";

export function MeetSettingsForm({
  meet,
  hasConfirmedResults,
}: {
  meet: Meet;
  hasConfirmedResults: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(meet.name);
  const [label, setLabel] = useState(meet.participant_label);
  const [status, setStatus] = useState<MeetStatus>(meet.status);
  const [pdfsPublic, setPdfsPublic] = useState(meet.pdfs_public);
  const [config, setConfig] = useState<PointsConfig>(meet.points_config);
  const [mode, setMode] = useState<"future" | "recalculate">("future");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const places = useMemo(
    () => Array.from({ length: config.max_places }, (_, i) => i + 1),
    [config.max_places],
  );

  function setPlace(kind: "individual" | "relay", place: number, value: string) {
    const n = Number(value);
    setConfig((current) => ({
      ...current,
      [kind]: { ...current[kind], [String(place)]: Number.isFinite(n) ? n : 0 },
    }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/meets/${meet.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          participant_label: label,
          status,
          pdfs_public: pdfsPublic,
          points_config: parsePointsConfig(config),
          points_mode: hasConfirmedResults ? mode : "future",
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Save failed");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Meet settings
        </p>
        <h1 className="text-3xl font-black text-cream">{meet.name}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-cream/70">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-cream/70">Participant label</span>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="University, School, Club…"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-cream/70">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MeetStatus)}
            className="h-10 w-full rounded-md border border-white/20 bg-navy px-2 text-cream"
          >
            {MEET_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-cream">
          <input
            type="checkbox"
            checked={pdfsPublic}
            onChange={(e) => setPdfsPublic(e.target.checked)}
          />
          Result PDFs are public
        </label>
      </div>

      <div className="space-y-3">
        <label className="space-y-1 text-sm">
          <span className="text-cream/70">Scoring places</span>
          <Input
            type="number"
            min={1}
            max={32}
            value={config.max_places}
            onChange={(e) =>
              setConfig((current) =>
                withMaxPlaces(current, Number(e.target.value) || 1),
              )
            }
          />
        </label>
        <div className="grid gap-6 md:grid-cols-2">
          {(["individual", "relay"] as const).map((kind) => (
            <div key={kind} className="rounded-xl border border-gold/20 p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-gold">
                {kind} points
              </h2>
              <div className="space-y-2">
                {places.map((place) => (
                  <label
                    key={place}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span>Place {place}</span>
                    <Input
                      type="number"
                      className="w-24 text-right"
                      value={config[kind][String(place)] ?? 0}
                      onChange={(e) => setPlace(kind, place, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasConfirmedResults ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-950/30 p-4 space-y-2">
          <p className="font-semibold text-amber-100">
            This meet already has confirmed results. Changing the points table:
          </p>
          <label className="flex items-start gap-2 text-sm text-cream">
            <input
              type="radio"
              checked={mode === "future"}
              onChange={() => setMode("future")}
            />
            Apply going forward only — already-published points stay as they are
          </label>
          <label className="flex items-start gap-2 text-sm text-cream">
            <input
              type="radio"
              checked={mode === "recalculate"}
              onChange={() => setMode("recalculate")}
            />
            Recalculate everything — standings will change to match the new table
          </label>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {saved ? <p className="text-sm text-gold">Saved.</p> : null}

      <Button type="button" disabled={busy} onClick={() => void save()}>
        {busy ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
