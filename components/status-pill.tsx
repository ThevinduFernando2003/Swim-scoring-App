import type { EventStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusPill({
  status,
  publicView = false,
}: {
  status: EventStatus;
  publicView?: boolean;
}) {
  const label =
    status === "confirmed"
      ? "Results Posted"
      : publicView
        ? "Upcoming"
        : status === "pending_review"
          ? "Pending Review"
          : "Not Uploaded";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        status === "confirmed"
          ? "bg-gold text-navy"
          : status === "pending_review" && !publicView
            ? "bg-amber-400 text-navy"
            : "bg-white/10 text-cream/80",
      )}
    >
      {label}
    </span>
  );
}
