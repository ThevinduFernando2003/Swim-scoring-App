import Link from "next/link";
import { MeetSponsors } from "@/components/meet-sponsors";
import type { Meet, MeetSponsor } from "@/lib/types";

export function MeetSubnav({
  meet,
  isAdmin,
  sponsors = [],
}: {
  meet: Meet;
  isAdmin: boolean;
  sponsors?: MeetSponsor[];
}) {
  const base = `/meets/${meet.slug}`;
  const links = [
    { href: base, label: "Leaderboard" },
    { href: `${base}/schedule`, label: "Schedule" },
    { href: `${base}/swimmers`, label: "Swimmers" },
    { href: `${base}/check-in`, label: "Check-in" },
  ];

  return (
    <div className="-mt-4 mb-8 border-b border-gold/20 pb-3">
      <div className="flex items-start gap-3">
        {meet.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meet.logo_url}
            alt=""
            className="h-12 w-12 rounded-md bg-white/5 object-contain"
          />
        ) : null}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">
            {meet.participant_label} meet
          </p>
          <h2 className="text-lg font-black text-cream sm:text-xl">{meet.name}</h2>
        </div>
      </div>
      <MeetSponsors sponsors={sponsors} placement="header" />
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
