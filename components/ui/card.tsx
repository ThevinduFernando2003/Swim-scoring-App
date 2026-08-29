import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gold/20 bg-navy-mid/80 shadow-lg shadow-black/30",
        className,
      )}
      {...props}
    />
  );
}
