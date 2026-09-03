"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PdfImportPanel } from "@/components/pdf-import-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ImportedSwimmer, Meet, Swimmer, Team } from "@/lib/types";

export function RosterDesk({
  meet,
  teams,
  swimmers,
  canImport,
}: {
  meet: Meet;
  teams: Team[];
  swimmers: Swimmer[];
  canImport: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "missing" | "present">("all");
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return swimmers.filter((swimmer) => {
      if (filter === "present" && !swimmer.present) return false;
      if (filter === "missing" && swimmer.present) return false;
      if (!q) return true;
      const hay = `${swimmer.name} ${swimmer.team_code ?? ""} ${swimmer.slasu_number ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [filter, query, swimmers]);

  async function patch(id: string, body: Record<string, unknown>) {
    setError(null);
    const response = await fetch(`/api/meets/${meet.slug}/swimmers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error || "Update failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Day-one desk
        </p>
        <h1 className="text-3xl font-black text-cream">Roster & check-in</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream/70">
          Import the entry list, then tick that each swimmer is on the meet
          register, has a SLASU registration, and is present to swim.
        </p>
      </div>

      {canImport ? (
        <PdfImportPanel<{ swimmers: ImportedSwimmer[] }>
          slug={meet.slug}
          kind="roster"
          title="Import participants from PDF"
          description={`Names, ${meet.participant_label.toLowerCase()} codes, age, and SLASU / registration numbers. Unknown team codes are skipped — import the team list first.`}
          applyLabel="Update roster"
          onApply={async (payload) => {
            const response = await fetch(`/api/meets/${meet.slug}/swimmers`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "bulk_upsert",
                swimmers: payload.swimmers,
              }),
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || "Import failed");
            router.refresh();
            const unknown = json.unknownCodes?.length
              ? ` Skipped unknown codes: ${json.unknownCodes.join(", ")}.`
              : "";
            return `Added ${json.created ?? 0}, updated ${json.updated ?? 0}.${unknown}`;
          }}
        >
          {(payload, setPayload) => (
            <div className="space-y-2">
              <p className="text-sm text-cream/70">
                {payload.swimmers?.length ?? 0} names ready to apply.{" "}
                {teams.length} {meet.participant_label.toLowerCase()}s on file.
              </p>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-widest text-gold">
                    <tr>
                      <th className="py-1">Name</th>
                      <th className="py-1">Code</th>
                      <th className="py-1">Age</th>
                      <th className="py-1">SLASU #</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payload.swimmers ?? []).map((row, index) => (
                      <tr key={index} className="border-t border-white/10">
                        <td className="py-1 pr-2">
                          <Input
                            value={row.name}
                            onChange={(e) => {
                              const swimmers = [...payload.swimmers];
                              swimmers[index] = { ...row, name: e.target.value };
                              setPayload({ swimmers });
                            }}
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <Input
                            value={row.team_code}
                            onChange={(e) => {
                              const swimmers = [...payload.swimmers];
                              swimmers[index] = {
                                ...row,
                                team_code: e.target.value.toUpperCase(),
                              };
                              setPayload({ swimmers });
                            }}
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <Input
                            type="number"
                            value={row.age ?? ""}
                            onChange={(e) => {
                              const swimmers = [...payload.swimmers];
                              const age = Number(e.target.value);
                              swimmers[index] = {
                                ...row,
                                age: Number.isFinite(age) && age > 0 ? age : null,
                              };
                              setPayload({ swimmers });
                            }}
                          />
                        </td>
                        <td className="py-1">
                          <Input
                            value={row.slasu_number ?? ""}
                            onChange={(e) => {
                              const swimmers = [...payload.swimmers];
                              swimmers[index] = {
                                ...row,
                                slasu_number: e.target.value || null,
                              };
                              setPayload({ swimmers });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </PdfImportPanel>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, team, or SLASU number"
        />
        <div className="flex gap-2">
          {(["all", "missing", "present"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase ${
                filter === item ? "bg-gold text-navy" : "bg-white/10 text-cream/70"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-gold/20">
        <table className="min-w-[880px] w-full text-left text-sm">
          <thead className="bg-navy-light text-xs uppercase tracking-widest text-gold">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">{meet.participant_label}</th>
              <th className="px-3 py-2">Age</th>
              <th className="px-3 py-2">SLASU #</th>
              <th className="px-3 py-2">Registered</th>
              <th className="px-3 py-2">SLASU</th>
              <th className="px-3 py-2">Present</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((swimmer) => (
              <tr key={swimmer.id} className="border-t border-white/10">
                <td className="px-3 py-2 font-semibold text-cream">{swimmer.name}</td>
                <td className="px-3 py-2 text-cream/80">{swimmer.team_code}</td>
                <td className="px-3 py-2 text-cream/80">
                  {swimmer.age ?? swimmer.age_group ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-cream/80">
                  {swimmer.slasu_number || "—"}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(swimmer.registered)}
                    onChange={(e) =>
                      void patch(swimmer.id, { registered: e.target.checked })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(swimmer.slasu_verified)}
                    onChange={(e) =>
                      void patch(swimmer.id, { slasu_verified: e.target.checked })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(swimmer.present)}
                    onChange={(e) =>
                      void patch(swimmer.id, { present: e.target.checked })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    defaultValue={swimmer.notes ?? ""}
                    placeholder="Desk note"
                    onBlur={(e) => {
                      const next = e.target.value.trim() || null;
                      if (next !== (swimmer.notes ?? null)) {
                        void patch(swimmer.id, { notes: next });
                      }
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-cream/40">
        {visible.length} shown · {swimmers.filter((s) => s.present).length} present ·{" "}
        {swimmers.filter((s) => s.slasu_verified).length} SLASU confirmed
      </p>
    </div>
  );
}
