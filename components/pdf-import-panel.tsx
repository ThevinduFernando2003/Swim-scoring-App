"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PdfImportPanel<T>({
  slug,
  kind,
  title,
  description,
  applyLabel,
  onApply,
  children,
}: {
  slug: string;
  kind: "teams" | "roster" | "schedule";
  title: string;
  description: string;
  applyLabel: string;
  onApply: (payload: T) => Promise<string>;
  children: (payload: T, setPayload: (next: T) => void) => React.ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<"extract" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<T | null>(null);

  async function extract(file: File) {
    setBusy("extract");
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      const response = await fetch(`/api/meets/${slug}/import`, {
        method: "POST",
        body,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Extraction failed");
      setPayload(json as T);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    if (!payload) return;
    setBusy("apply");
    setError(null);
    try {
      const result = await onApply(payload);
      setMessage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-gold/20 bg-navy-mid p-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-cream/70">{description}</p>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void extract(file);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed p-6 text-center",
          dragOver ? "border-gold bg-gold/10" : "border-gold/30",
        )}
      >
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
          variant="outline"
          disabled={busy !== null}
          onClick={() => fileRef.current?.click()}
        >
          {busy === "extract" ? "Reading PDF…" : "Choose PDF"}
        </Button>
      </div>
      {payload ? children(payload, setPayload) : null}
      {payload ? (
        <Button type="button" disabled={busy !== null} onClick={() => void apply()}>
          {busy === "apply" ? "Updating…" : applyLabel}
        </Button>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {message ? <p className="text-sm text-gold">{message}</p> : null}
    </div>
  );
}
