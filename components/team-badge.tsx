import { cn } from "@/lib/utils";

export function TeamBadge({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-14 items-center justify-center rounded-sm bg-gold px-2 py-1 font-mono text-sm font-black tracking-widest text-navy",
        className,
      )}
    >
      {code}
    </span>
  );
}
