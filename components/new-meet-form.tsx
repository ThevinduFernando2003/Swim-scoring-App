"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/constants";
import type { Championship, Meet } from "@/lib/types";

export function NewMeetForm({
  cloneSources,
  championships,
}: {
  cloneSources: Meet[];
  championships: Championship[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [label, setLabel] = useState("Team");
  const [cloneFrom, setCloneFrom] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [championshipId, setChampionshipId] = useState("");
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesSlug, setNewSeriesSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const autoSlug = useMemo(() => slugify(name), [name]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/meets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slugTouched ? slug : autoSlug,
          participant_label: label,
          clone_from: cloneFrom || null,
          year: year ? Number(year) : null,
          championship_id: championshipId || null,
          championship_name: championshipId ? null : newSeriesName || null,
          championship_slug: championshipId ? null : newSeriesSlug || null,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not create meet");
      router.push(`/meets/${json.slug}/admin/settings`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create meet");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="max-w-xl space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Super admin
        </p>
        <h1 className="text-3xl font-black text-cream">New meet</h1>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="text-cream/70">Name</span>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sri Lanka Schools Swimming Championships 2026"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-cream/70">URL slug</span>
        <Input
          required
          value={slugTouched ? slug : autoSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-cream/70">Participant label</span>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="University / School / Club"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-cream/70">Year</span>
        <Input
          type="number"
          min={1990}
          max={2100}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-cream/70">Championship series</span>
        <select
          value={championshipId}
          onChange={(e) => setChampionshipId(e.target.value)}
          className="h-10 w-full rounded-md border border-white/20 bg-navy px-2 text-cream"
        >
          <option value="">New series or one-off meet</option>
          {championships.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {championshipId ? null : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Series name (Inter University Swimming Championships)"
            value={newSeriesName}
            onChange={(e) => setNewSeriesName(e.target.value)}
          />
          <Input
            placeholder="Series slug (inter-uni)"
            value={newSeriesSlug}
            onChange={(e) => setNewSeriesSlug(e.target.value)}
          />
        </div>
      )}
      <label className="block space-y-1 text-sm">
        <span className="text-cream/70">Start from</span>
        <select
          value={cloneFrom}
          onChange={(e) => setCloneFrom(e.target.value)}
          className="h-10 w-full rounded-md border border-white/20 bg-navy px-2 text-cream"
        >
          <option value="">Blank schedule (empty meet)</option>
          {cloneSources.map((meet) => (
            <option key={meet.id} value={meet.slug}>
              Clone schedule + points from {meet.name}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <Button type="submit" disabled={busy || !name}>
        {busy ? "Creating…" : "Create draft meet"}
      </Button>
    </form>
  );
}
