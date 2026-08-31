import Link from "next/link";
import type { Meet } from "@/lib/types";

export function MeetSubnav({
  meet,
  isAdmin,
}: {
  meet: Meet;
  isAdmin: boolean;
}) {
  const base = `/meets/${meet.slug}`;
  const links = [
    { href: base, label: "Leaderboard" },
    { href: `${base}/schedule`, label: "Schedule" },
    { href: `${base}/swimmers`, label: "Swimmers" },
  ];

  return (
    <div className="-mt-4 mb-8 border-b border-gold/20 pb-3">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">
        {meet.participant_label} meet
      </p>
      <h2 className="text-lg font-black text-cream sm:text-xl">{meet.name}</h2>
      <nav className="mt-3 flex flex-wrap gap-1 text-sm font-semibold">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-2 text-cream hover:bg-white/10"
          >
            {link.label}
          </Link>
        ))}
        {isAdmin ? (
          <Link
            href={`${base}/admin`}
            className="rounded-md bg-gold px-3 py-2 text-navy"
          >
            Meet admin
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
