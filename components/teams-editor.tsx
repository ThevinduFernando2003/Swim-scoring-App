"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PdfImportPanel } from "@/components/pdf-import-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ImportedTeam, Meet, Team } from "@/lib/types";

export function TeamsEditor({ meet, teams }: { meet: Meet; teams: Team[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/meets/${meet.slug}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Request failed");
      setCode("");
      setName("");
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
          {meet.participant_label} list
        </p>
        <h1 className="text-3xl font-black text-cream">
          {meet.participant_label}s
        </h1>
      </div>

      <PdfImportPanel<{ teams: ImportedTeam[] }>
        slug={meet.slug}
        kind="teams"
        title={`Import ${meet.participant_label.toLowerCase()} list from PDF`}
        description="Drop the official team/school list. Review the extracted codes and names, then apply. Existing codes are updated; new codes are added."
        applyLabel={`Update ${meet.participant_label.toLowerCase()} list`}
        onApply={async (payload) => {
          const response = await fetch(`/api/meets/${meet.slug}/teams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "bulk_upsert", teams: payload.teams }),
          });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error || "Import failed");
          router.refresh();
          return `Added ${json.created ?? 0}, updated ${json.updated ?? 0}.`;
        }}
      >
        {(payload, setPayload) => (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-gold">
                <tr>
                  <th className="py-2">Code</th>
                  <th className="py-2">Name</th>
                </tr>
              </thead>
              <tbody>
                {(payload.teams ?? []).map((row, index) => (
                  <tr key={index} className="border-t border-white/10">
                    <td className="py-1 pr-2">
                      <Input
                        value={row.code}
                        onChange={(e) => {
                          const teams = [...payload.teams];
                          teams[index] = { ...row, code: e.target.value.toUpperCase() };
                          setPayload({ teams });
                        }}
                      />
                    </td>
                    <td className="py-1">
                      <Input
                        value={row.name}
                        onChange={(e) => {
                          const teams = [...payload.teams];
                          teams[index] = { ...row, name: e.target.value };
                          setPayload({ teams });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PdfImportPanel>

      <form
        className="flex flex-col gap-3 rounded-xl border border-gold/20 bg-navy-mid p-4 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void request({ action: "create", code, name });
        }}
      >
        <label className="space-y-1 text-sm">
          <span className="text-cream/70">Code</span>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="COL"
            required
          />
        </label>
        <label className="min-w-0 flex-1 space-y-1 text-sm">
          <span className="text-cream/70">Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`University of …`}
            required
          />
        </label>
        <Button type="submit" disabled={busy}>
          Add
        </Button>
      </form>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <ul className="space-y-2">
        {teams.map((team) => (
          <TeamRow
            key={team.id}
            team={team}
            busy={busy}
            onSave={(patch) =>
              void request({ action: "update", id: team.id, ...patch })
            }
            onDelete={() => void request({ action: "delete", id: team.id })}
          />
        ))}
      </ul>
    </div>
  );
}

function TeamRow({
  team,
  busy,
  onSave,
  onDelete,
}: {
  team: Team;
  busy: boolean;
  onSave: (patch: { code: string; name: string }) => void;
  onDelete: () => void;
}) {
  const [code, setCode] = useState(team.code);
  const [name, setName] = useState(team.name);
  const dirty = code !== team.code || name !== team.name;

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-gold/20 bg-navy-mid p-3 sm:flex-row sm:items-center">
      <Input
        className="sm:w-28"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />
      <Input
        className="flex-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || !dirty}
          onClick={() => onSave({ code, name })}
        >
          Save
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={busy}
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}
