"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { TeamBadge } from "@/components/team-badge";
import type { Meet, Swimmer } from "@/lib/types";

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        ok ? "bg-gold text-navy" : "bg-white/10 text-cream/50"
      }`}
    >
      {label}
    </span>
  );
}

export function PublicCheckIn({
  meet,
  swimmers,
}: {
  meet: Meet;
  swimmers: Swimmer[];
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return swimmers
      .filter((swimmer) => {
        const hay = `${swimmer.name} ${swimmer.team_code ?? ""} ${swimmer.slasu_number ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [query, swimmers]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Day-one verification
        </p>
        <h1 className="text-3xl font-black text-cream sm:text-5xl">Check-in</h1>
        <p className="mt-2 max-w-2xl text-cream/70">
          Search your name to confirm you are on the meet register, that SLASU
          registration is marked, and that the desk has ticked you present.
        </p>
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type at least 2 letters of your name"
      />
      <ul className="space-y-2">
        {visible.map((swimmer) => (
          <li key={swimmer.id}>
            <Link
              href={`/meets/${meet.slug}/swimmers/${swimmer.id}`}
              className="flex flex-col gap-2 rounded-xl border border-gold/20 bg-navy-mid px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-cream">{swimmer.name}</p>
                <p className="text-sm text-cream/60">
                  <TeamBadge code={swimmer.team_code ?? "—"} /> {swimmer.team_name}
                  {swimmer.age ? ` · ${swimmer.age}` : ""}
                  {swimmer.slasu_number ? ` · ${swimmer.slasu_number}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge ok={Boolean(swimmer.registered)} label="Registered" />
                <Badge ok={Boolean(swimmer.slasu_verified)} label="SLASU" />
                <Badge ok={Boolean(swimmer.present)} label="Present" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {query.trim().length >= 2 && visible.length === 0 ? (
        <p className="text-sm text-cream/60">
          No matching name. Ask the desk if you should be on the entry list.
        </p>
      ) : null}
    </div>
  );
}
