import { cn } from "./classnames";
import { Spinner } from "./spinner";

type LoadingStateProps = {
  label?: string;
  compact?: boolean;
  className?: string;
};

export function LoadingState({
  label = "Loading",
  compact = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      aria-label={label}
      className={cn(
        "flex items-center gap-2 text-sm text-slate-600",
        compact ? "py-1" : "py-3",
        className,
      )}
      role="status"
    >
      <Spinner decorative label={label} />
      <span>{label}</span>
    </div>
  );
}
