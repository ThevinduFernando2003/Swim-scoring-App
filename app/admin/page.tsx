import Link from "next/link";
import { MeetStatusBadge } from "@/components/meet-status-badge";
import { parsePointsConfig } from "@/lib/points";
import { listAccessibleMeets } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Meet } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { isSuperAdmin, meets } = await listAccessibleMeets(supabase, user);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
            Scoring desk
          </p>
          <h1 className="text-3xl font-black text-cream">Your meets</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin ? (
            <>
              <Link
                href="/admin/meets/new"
                className="rounded-md bg-gold px-3 py-2 text-sm font-bold text-navy"
              >
                + New meet
              </Link>
              <Link
                href="/admin/organization"
                className="rounded-md border border-gold/40 px-3 py-2 text-sm font-semibold text-gold"
              >
                Branding
              </Link>
            </>
          ) : null}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md px-3 py-2 text-sm font-semibold text-cream/70 hover:text-cream"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <p className="text-sm text-cream/70">
        Operator guide:{" "}
        <Link href="/admin/guide" className="text-gold">
          Running a meet
        </Link>
        . Non-technical steps for creating a meet, uploading results, and closing
        out.
      </p>

      <ul className="space-y-3">
        {meets.map((row) => {
          if (!row) return null;
          const meet = asMeet(row as Record<string, unknown>);
          const role = "role" in row ? String((row as { role?: string }).role ?? "") : isSuperAdmin ? "super admin" : "";
          return (
            <li
              key={meet.id}
              className="flex flex-col gap-3 rounded-xl border border-gold/20 bg-navy-mid p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-cream">{meet.name}</h2>
                  <MeetStatusBadge status={meet.status} />
                </div>
                <p className="text-xs uppercase tracking-widest text-cream/50">
                  {role.replace("_", " ")} · {meet.participant_label}
                </p>
              </div>
              <Link
                href={`/meets/${meet.slug}/admin`}
                className="rounded-md bg-gold px-3 py-2 text-sm font-bold text-navy"
              >
                Open admin
              </Link>
            </li>
          );
        })}
      </ul>

      {meets.length === 0 ? (
        <p className="rounded-xl border border-gold/20 bg-navy-mid p-6 text-cream/70">
          You are not assigned to a meet yet. Ask a super admin to add your email
          as an official.
        </p>
      ) : null}
    </div>
  );
}

function asMeet(row: Record<string, unknown>): Meet {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    participant_label: String(row.participant_label ?? "Team"),
    status: (row.status as Meet["status"]) ?? "draft",
    points_config: parsePointsConfig(row.points_config),
    pdfs_public: row.pdfs_public !== false,
  };
}
