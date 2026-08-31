import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import type { OrgSettings } from "@/lib/types";

export async function SiteHeader({ org }: { org: OrgSettings }) {
  let isAdmin = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      isAdmin = Boolean(user);
    } catch {
      isAdmin = false;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gold/30 bg-navy/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3 leading-tight">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logo_url}
              alt=""
              className="h-10 w-10 rounded-md object-contain bg-white/5"
            />
          ) : null}
          <span className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
              Live scoring
            </span>
            <span className="text-lg font-black tracking-tight text-cream sm:text-xl">
              {org.name}
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-3">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-cream hover:bg-white/10"
          >
            Meets
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              className="rounded-md bg-gold px-3 py-2 text-navy"
            >
              Admin
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-gold hover:bg-gold/10"
            >
              Officials
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
