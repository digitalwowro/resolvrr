import { cn } from "./classnames";

export function Spinner({
  label = "Loading",
  className,
  decorative = false,
}: {
  label?: string;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600",
        className,
      )}
      role={decorative ? undefined : "status"}
    />
  );
}
