"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrgSettings } from "@/lib/types";

export function OrgSettingsForm({ org }: { org: OrgSettings }) {
  const router = useRouter();
  const [name, setName] = useState(org.name);
  const [logoUrl, setLogoUrl] = useState(org.logo_url ?? "");
  const [color, setColor] = useState(org.primary_color);
  const [footer, setFooter] = useState(org.footer_text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          logo_url: logoUrl || null,
          primary_color: color,
          footer_text: footer,
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
    <form onSubmit={(e) => void save(e)} className="max-w-xl space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Super admin
        </p>
        <h1 className="text-3xl font-black text-cream">Organisation branding</h1>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="text-cream/70">Organisation name</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-cream/70">Logo URL</span>
        <Input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://…"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-cream/70">Primary colour</span>
        <Input value={color} onChange={(e) => setColor(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-cream/70">Footer text</span>
        <Input value={footer} onChange={(e) => setFooter(e.target.value)} />
      </label>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {saved ? <p className="text-sm text-gold">Saved. Refresh if colours look stale.</p> : null}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save branding"}
      </Button>
    </form>
  );
}
