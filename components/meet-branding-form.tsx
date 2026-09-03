"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Meet, MeetSponsor } from "@/lib/types";

export function MeetBrandingForm({
  meet,
  sponsors,
}: {
  meet: Meet;
  sponsors: MeetSponsor[];
}) {
  const router = useRouter();
  const [color, setColor] = useState(meet.primary_color ?? "#d4af37");
  const [logoUrl, setLogoUrl] = useState(meet.logo_url ?? "");
  const [backgroundUrl, setBackgroundUrl] = useState(meet.background_url ?? "");
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorLogo, setSponsorLogo] = useState("");
  const [sponsorUrl, setSponsorUrl] = useState("");
  const [placement, setPlacement] = useState<"footer" | "background" | "header">(
    "footer",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function upload(kind: string, file: File) {
    const body = new FormData();
    body.set("kind", kind);
    body.set("file", file);
    const response = await fetch(`/api/meets/${meet.slug}/assets`, {
      method: "POST",
      body,
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "Upload failed");
    return json.url as string;
  }

  async function saveLook() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/meets/${meet.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_color: color,
          logo_url: logoUrl || null,
          background_url: backgroundUrl || null,
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

  async function sponsorAction(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/meets/${meet.slug}/sponsors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Request failed");
      setSponsorName("");
      setSponsorLogo("");
      setSponsorUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Public look
        </p>
        <h1 className="text-3xl font-black text-cream">Appearance</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream/70">
          These show on this meet’s public pages only — logo on the front,
          colour for highlights, optional background, and sponsor marks in the
          footer or as a faint background strip.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-cream/70">Highlight colour</span>
          <div className="flex gap-2">
            <Input
              type="color"
              className="w-16 p-1"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-cream/70">Official logo</span>
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://… or upload below"
          />
          <input
            type="file"
            accept="image/*"
            className="mt-2 text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void upload("logo", file)
                .then(setLogoUrl)
                .catch((err) => setError(err.message));
            }}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-cream/70">Background image (optional)</span>
          <Input
            value={backgroundUrl}
            onChange={(e) => setBackgroundUrl(e.target.value)}
            placeholder="Faint watermark behind the meet pages"
          />
          <input
            type="file"
            accept="image/*"
            className="mt-2 text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void upload("background", file)
                .then(setBackgroundUrl)
                .catch((err) => setError(err.message));
            }}
          />
        </label>
      </div>
      <Button type="button" disabled={busy} onClick={() => void saveLook()}>
        {busy ? "Saving…" : "Save appearance"}
      </Button>
      {saved ? <p className="text-sm text-gold">Saved. Refresh the public page to see it.</p> : null}

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gold">
          Sponsors
        </h2>
        <form
          className="grid gap-3 rounded-xl border border-gold/20 bg-navy-mid p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void sponsorAction({
              action: "create",
              name: sponsorName,
              logo_url: sponsorLogo || null,
              url: sponsorUrl || null,
              placement,
            });
          }}
        >
          <Input
            required
            value={sponsorName}
            onChange={(e) => setSponsorName(e.target.value)}
            placeholder="Sponsor name"
          />
          <select
            value={placement}
            onChange={(e) =>
              setPlacement(e.target.value as "footer" | "background" | "header")
            }
            className="h-10 rounded-md border border-white/20 bg-navy px-2 text-cream"
          >
            <option value="footer">Footer strip</option>
            <option value="header">Under the meet title</option>
            <option value="background">Background watermark</option>
          </select>
          <Input
            value={sponsorLogo}
            onChange={(e) => setSponsorLogo(e.target.value)}
            placeholder="Logo URL"
          />
          <Input
            value={sponsorUrl}
            onChange={(e) => setSponsorUrl(e.target.value)}
            placeholder="Website (optional)"
          />
          <div className="sm:col-span-2">
            <input
              type="file"
              accept="image/*"
              className="mb-2 text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void upload("sponsor", file)
                  .then(setSponsorLogo)
                  .catch((err) => setError(err.message));
              }}
            />
            <Button type="submit" disabled={busy}>
              Add sponsor
            </Button>
          </div>
        </form>
        <ul className="space-y-2">
          {sponsors.map((sponsor) => (
            <li
              key={sponsor.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-gold/20 bg-navy-mid px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {sponsor.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sponsor.logo_url} alt="" className="h-8 w-8 object-contain" />
                ) : null}
                <div>
                  <p className="font-semibold text-cream">{sponsor.name}</p>
                  <p className="text-xs uppercase tracking-widest text-cream/50">
                    {sponsor.placement}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => void sponsorAction({ action: "delete", id: sponsor.id })}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
