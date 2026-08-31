import type { MeetStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MeetStatusBadge({ status }: { status: MeetStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        status === "live"
          ? "bg-gold text-navy"
          : status === "completed"
            ? "bg-white/15 text-cream"
            : "bg-amber-400/20 text-amber-200",
      )}
    >
      {status}
    </span>
  );
}
