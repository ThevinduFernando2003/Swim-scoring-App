import Link from "next/link";
import { MeetDirectory } from "@/components/meet-directory";
import { loadPublicMeets } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const { meets, needsMigration } = await loadPublicMeets(supabase);

  if (needsMigration) {
    return (
      <div className="rounded-xl border border-gold/30 bg-navy-mid p-8">
        <h1 className="text-3xl font-black text-cream">Database upgrade needed</h1>
        <p className="mt-3 max-w-xl text-cream/80">
          This app is now multi-meet. In the Supabase SQL editor, run{" "}
          <code className="text-gold">supabase/migration_v2.sql</code> once
          against the live database. Existing Inter Uni results are kept and
          labelled as meet <code className="text-gold">inter-uni-2026</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">
          Championships
        </p>
        <h1 className="text-3xl font-black tracking-tight text-cream sm:text-5xl">
          Meets
        </h1>
        <p className="mt-2 max-w-2xl text-cream/70">
          Choose a meet to view live standings, the programme, and original
          result sheets.
        </p>
      </div>
      <MeetDirectory meets={meets} />
      <p className="text-sm text-cream/50">
        Officials:{" "}
        <Link href="/login" className="text-gold">
          sign in
        </Link>
      </p>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="rounded-xl border border-gold/30 bg-navy-mid p-8">
      <h1 className="text-3xl font-black text-cream">Meets</h1>
      <p className="mt-3 max-w-xl text-cream/80">
        Connect Supabase to load championships. Copy{" "}
        <code className="text-gold">.env.example</code> to{" "}
        <code className="text-gold">.env.local</code>, run{" "}
        <code className="text-gold">supabase/schema.sql</code>,{" "}
        <code className="text-gold">supabase/seed.sql</code>, then{" "}
        <code className="text-gold">supabase/migration_v2.sql</code>.
      </p>
    </div>
  );
}
