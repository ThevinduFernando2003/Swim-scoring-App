import Link from "next/link";
import type { Championship, Meet } from "@/lib/types";

export function EditionSwitcher({
  championship,
  editions,
  currentSlug,
}: {
  championship: Championship;
  editions: Meet[];
  currentSlug: string;
}) {
  if (editions.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <Link
        href={`/championships/${championship.slug}`}
        className="font-semibold text-gold"
      >
        {championship.name}
      </Link>
      <span className="text-cream/40">·</span>
      {editions.map((edition) => (
        <Link
          key={edition.id}
          href={`/meets/${edition.slug}`}
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            edition.slug === currentSlug
              ? "bg-gold text-navy"
              : "bg-white/10 text-cream/70 hover:text-cream"
          }`}
        >
          {edition.year ?? edition.slug}
        </Link>
      ))}
    </div>
  );
}
