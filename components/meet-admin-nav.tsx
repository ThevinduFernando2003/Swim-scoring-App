import Link from "next/link";
import type { Access, Meet } from "@/lib/types";

export function MeetAdminNav({ meet, access }: { meet: Meet; access: Access }) {
  const base = `/meets/${meet.slug}/admin`;
  const links = [
    { href: base, label: "Uploads", manage: false },
    { href: `${base}/audit`, label: "Audit", manage: false },
    { href: `${base}/settings`, label: "Settings", manage: true },
    { href: `${base}/teams`, label: meet.participant_label + "s", manage: true },
    { href: `${base}/roster`, label: "Roster / check-in", manage: false },
    { href: `${base}/schedule`, label: "Schedule", manage: true },
    { href: `${base}/appearance`, label: "Appearance", manage: true },
    { href: `${base}/officials`, label: "Officials", manage: true },
  ];

  return (
    <nav className="mb-6 flex flex-wrap gap-2 text-sm font-semibold">
      {links
        .filter((link) => access.canManage || !link.manage)
        .map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md border border-gold/30 px-3 py-1.5 text-cream hover:bg-white/10"
          >
            {link.label}
          </Link>
        ))}
      <Link
        href={`/meets/${meet.slug}`}
        className="rounded-md px-3 py-1.5 text-gold"
      >
        Public view
      </Link>
    </nav>
  );
}
