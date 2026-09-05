"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pointsFor } from "@/lib/points";
import { unknownTeamCodes } from "@/lib/publish";
import { findDuplicateWarnings } from "@/lib/swimmers";
import { applyTiedPlaces, tiedPositions } from "@/lib/ties";
import type {
  ExtractionPayload,
  Meet,
  MeetEvent,
  PointsConfig,
  ResultStatus,
  ReviewedResult,
  Swimmer,
  Team,
} from "@/lib/types";
import { RESULT_STATUSES } from "@/lib/types";
import { cn } from "@/lib/utils";

function extractionToRows(payload: ExtractionPayload | null): ReviewedResult[] {
  if (!payload?.results?.length) return [emptyRow()];
  return payload.results.map((row) => ({
    position: row.position,
    swimmer_name: row.name,
    team_code: row.team_code,
    achievement: row.achievement,
    result_status: row.status,
  }));
}

function emptyRow(): ReviewedResult {
  return {
    position: null,
    swimmer_name: "",
    team_code: "",
    achievement: "",
    result_status: "finished",
  };
}

export function EventReview({
  meet,
  event,
  teams,
  swimmers,
  pointsConfig,
  initialExtraction,
  initialUploadId,
}: {
  meet: Meet;
  event: MeetEvent;
  teams: Team[];
  swimmers: Swimmer[];
  pointsConfig: PointsConfig;
  initialExtraction: ExtractionPayload | null;
  initialUploadId: number | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ReviewedResult[]>(() =>
    extractionToRows(initialExtraction),
  );
  const [uploadId, setUploadId] = useState<number | null>(initialUploadId);
  const [busy, setBusy] = useState<"extract" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const ranked = useMemo(() => applyTiedPlaces(rows), [rows]);
  const ties = useMemo(() => tiedPositions(ranked), [ranked]);
  const unknown = useMemo(() => unknownTeamCodes(rows, teams), [rows, teams]);
  const knownCodes = useMemo(
    () => new Set(teams.map((team) => team.code.toUpperCase())),
    [teams],
  );
  const duplicates = useMemo(
    () => findDuplicateWarnings(rows, swimmers, teams),
    [rows, swimmers, teams],
  );
  const readOnly = meet.status === "completed";
  const adminHome = `/meets/${meet.slug}/admin`;

  async function extract(file: File | null, useFixture = false) {
    setBusy("extract");
    setError(null);
    try {
      const body = new FormData();
      if (file) body.set("file", file);
      if (useFixture) body.set("useFixture", "true");
      const response = await fetch(`/api/events/${event.id}/extract`, {
        method: "POST",
        body,
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Extraction failed");
      }
      setUploadId(json.uploadId);
      setRows(extractionToRows(json.extraction));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (unknown.length > 0) return;
    if (event.status === "confirmed" && !replace) {
      setError("Tick “Replace existing result” to overwrite this event’s points.");
      return;
    }
    setBusy("publish");
    setError(null);
    try {
      const response = await fetch(`/api/events/${event.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replace: event.status === "confirmed" ? true : replace,
          uploadId,
          results: rows,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Publish failed");
      }
      router.push(adminHome);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  function updateRow(index: number, patch: Partial<ReviewedResult>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="space-y-6">
      <Link href={adminHome} className="text-sm font-semibold text-gold">
        ← Dashboard
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Day {event.day} · Event {event.event_number} · {event.gender} ·{" "}
          {event.event_type}
        </p>
        <h1 className="text-3xl font-black text-cream">{event.name}</h1>
      </div>

      {readOnly ? (
        <p className="rounded-md border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          This meet is completed and read-only. Re-open it from Settings if you
          need to correct a result.
        </p>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!readOnly) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (readOnly) return;
          const file = e.dataTransfer.files[0];
          if (file) void extract(file);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center",
          dragOver ? "border-gold bg-gold/10" : "border-gold/30 bg-navy-mid",
        )}
      >
        <p className="font-semibold text-cream">Drop a result PDF here</p>
        <p className="mt-1 text-sm text-cream/60">or choose a file</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void extract(file);
            }}
          />
          <Button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null || readOnly}
          >
            {busy === "extract" ? "Extracting…" : "Choose PDF"}
          </Button>
          {process.env.NODE_ENV !== "production" ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null || readOnly}
              onClick={() => void extract(null, true)}
            >
              Load Event 5 fixture
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gold/20">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-navy-light text-xs uppercase tracking-widest text-gold">
            <tr>
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">{meet.participant_label}</th>
              <th className="px-3 py-2">Time / code</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Pts</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const code = row.team_code.trim().toUpperCase();
              const unknownTeam = Boolean(code) && !knownCodes.has(code);
              const dup = duplicates.find((item) => item.rowIndex === index);
              const rankedRow = ranked[index];
              const isTie =
                rankedRow?.position != null && ties.has(rankedRow.position);
              return (
                <tr key={index} className="border-t border-white/10">
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={1}
                      value={row.position ?? ""}
                      onChange={(e) =>
                        updateRow(index, {
                          position: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.swimmer_name}
                      onChange={(e) =>
                        updateRow(index, { swimmer_name: e.target.value })
                      }
                    />
                    {dup ? (
                      <p className="mt-1 text-[11px] text-amber-200">
                        Similar name on {dup.teamCode}: {dup.matches.join(", ")}.
                        Edit to merge, or leave if they are different people.
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.team_code}
                      onChange={(e) =>
                        updateRow(index, { team_code: e.target.value })
                      }
                      className={cn(
                        "h-10 w-full rounded-md border bg-navy px-2 text-cream",
                        unknownTeam
                          ? "border-red-500 ring-2 ring-red-500"
                          : "border-white/20",
                      )}
                    >
                      <option value="">Select</option>
                      {unknownTeam ? (
                        <option value={row.team_code}>{row.team_code} (unknown)</option>
                      ) : null}
                      {teams.map((team) => (
                        <option key={team.id} value={team.code}>
                          {team.code} — {team.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.achievement}
                      onChange={(e) =>
                        updateRow(index, { achievement: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.result_status}
                      onChange={(e) =>
                        updateRow(index, {
                          result_status: e.target.value as ResultStatus,
                        })
                      }
                      className="h-10 w-full rounded-md border border-white/20 bg-navy px-2 text-cream"
                    >
                      {RESULT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-lg font-black">
                    <div>
                      {pointsFor(
                        event.event_type,
                        rankedRow?.position ?? row.position,
                        row.result_status,
                        pointsConfig,
                      )}
                    </div>
                    {isTie ? (
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gold">
                        Tie {rankedRow.position}=
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs text-red-300"
                      onClick={() =>
                        setRows((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="navy"
          onClick={() => setRows((current) => [...current, emptyRow()])}
        >
          Add row
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setRows((current) => applyTiedPlaces(current))}
        >
          Rank from times
        </Button>
      </div>
      <p className="text-xs text-cream/50">
        Equal times share a place (1=, 1=) and skip the next. Publish always
        re-ranks finishers from the clock times.
      </p>

      {unknown.length > 0 ? (
        <p className="rounded-md border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          Unknown {meet.participant_label.toLowerCase()} codes must be fixed before
          publishing: {unknown.join(", ")}
        </p>
      ) : null}

      {duplicates.length > 0 ? (
        <p className="rounded-md border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          Possible duplicate names on the same {meet.participant_label.toLowerCase()}{" "}
          were flagged. Matching on confirm is exact (name + team) — similar
          spellings are not merged automatically.
        </p>
      ) : null}

      {event.status === "confirmed" ? (
        <label className="flex items-center gap-2 text-sm text-cream">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
          />
          Replace existing result (recalculates this event from scratch — does not
          stack points)
        </label>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <Button
        type="button"
        size="lg"
        disabled={busy !== null || unknown.length > 0 || rows.length === 0 || readOnly}
        onClick={() => void publish()}
      >
        {busy === "publish"
          ? "Publishing…"
          : event.status === "confirmed"
            ? "Replace & Publish"
            : "Confirm & Publish"}
      </Button>
    </div>
  );
}
