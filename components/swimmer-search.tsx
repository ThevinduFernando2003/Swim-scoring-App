"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { TeamBadge } from "@/components/team-badge";
import type { Swimmer } from "@/lib/types";

export function SwimmerSearch({
  slug,
  swimmers,
  participantLabel,
}: {
  slug: string;
  swimmers: Swimmer[];
  participantLabel: string;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return swimmers;
    return swimmers.filter((swimmer) => {
      const hay = `${swimmer.name} ${swimmer.team_code ?? ""} ${swimmer.team_name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, swimmers]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Directory
        </p>
        <h1 className="text-3xl font-black text-cream sm:text-5xl">Swimmers</h1>
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or team"
      />
      <ul className="space-y-2">
        {visible.map((swimmer) => (
          <li key={swimmer.id}>
            <Link
              href={`/meets/${slug}/swimmers/${swimmer.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-gold/20 bg-navy-mid px-4 py-3 hover:border-gold/50"
            >
              <span className="font-semibold text-cream">{swimmer.name}</span>
              <span className="flex items-center gap-2 text-sm text-cream/70">
                <TeamBadge code={swimmer.team_code ?? "—"} />
                <span className="hidden sm:inline">{swimmer.team_name}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {visible.length === 0 ? (
        <p className="text-sm text-cream/60">
          No swimmers match that search. Names appear after results are published.
        </p>
      ) : null}
      <p className="text-xs text-cream/40">
        {swimmers.length} named athletes in this {participantLabel.toLowerCase()} meet.
      </p>
    </div>
  );
}
