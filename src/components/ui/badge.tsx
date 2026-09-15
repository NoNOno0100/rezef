import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  ...props
}: React.ComponentProps<"span"> & { tone?: "muted" | "live" | "ready" | "warn" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tone === "muted" && "bg-elevated text-muted",
        tone === "live" && "bg-accent/15 text-accent",
        tone === "ready" && "bg-success/15 text-success",
        tone === "warn" && "bg-danger/15 text-danger",
        className,
      )}
      {...props}
    />
  );
}
