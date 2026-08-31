"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type OfficialRow = {
  id: string;
  user_id: string;
  role: string;
  email?: string | null;
};

export function OfficialsManager({
  slug,
  officials,
}: {
  slug: string;
  officials: OfficialRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"official" | "meet_admin">("official");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/meets/${slug}/officials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Invite failed");
      setEmail("");
      setMessage(json.message || "Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/meets/${slug}/officials`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Remove failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Access
        </p>
        <h1 className="text-3xl font-black text-cream">Officials</h1>
        <p className="mt-2 max-w-2xl text-sm text-cream/70">
          The person must already have a login, or they will be emailed an invite
          to create one. Officials can upload and confirm results. Meet admins can
          also edit teams, schedule, and points.
        </p>
      </div>

      <form
        onSubmit={(e) => void invite(e)}
        className="flex flex-col gap-3 rounded-xl border border-gold/20 bg-navy-mid p-4 sm:flex-row sm:items-end"
      >
        <label className="min-w-0 flex-1 space-y-1 text-sm">
          <span className="text-cream/70">Email</span>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="official@example.com"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-cream/70">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "official" | "meet_admin")}
            className="h-10 rounded-md border border-white/20 bg-navy px-2 text-cream"
          >
            <option value="official">Official</option>
            <option value="meet_admin">Meet admin</option>
          </select>
        </label>
        <Button type="submit" disabled={busy}>
          Add
        </Button>
      </form>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {message ? <p className="text-sm text-gold">{message}</p> : null}

      <ul className="space-y-2">
        {officials.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-gold/20 bg-navy-mid px-4 py-3"
          >
            <div>
              <p className="font-semibold text-cream">
                {row.email ?? row.user_id}
              </p>
              <p className="text-xs uppercase tracking-widest text-gold">
                {row.role.replace("_", " ")}
              </p>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => void remove(row.user_id)}
            >
              Remove
            </Button>
          </li>
        ))}
        {officials.length === 0 ? (
          <p className="text-sm text-cream/60">No officials assigned yet.</p>
        ) : null}
      </ul>
    </div>
  );
}
