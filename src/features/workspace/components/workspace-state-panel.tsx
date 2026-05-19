import { AlertCircle, Inbox, WifiOff } from "lucide-react";
import { LoadingState, StatusBadge } from "@/components/ui";
import type { StaticStateVariant } from "../static-types";

type WorkspaceStatePanelProps = {
  variant: StaticStateVariant;
};

export function WorkspaceStatePanel({ variant }: WorkspaceStatePanelProps) {
  if (variant.id === "loading") {
    return (
      <div className="flex min-h-72 items-center justify-center border-t border-slate-200 bg-white">
        <LoadingState label={variant.title} />
      </div>
    );
  }

  const Icon =
    variant.id === "disconnected"
      ? WifiOff
      : variant.id === "error"
        ? AlertCircle
        : Inbox;
  const tone = variant.id === "error" ? "danger" : "warning";
  const label = variant.id === "empty" ? "Empty" : variant.label;

  return (
    <div className="flex min-h-72 items-center justify-center border-t border-slate-200 bg-white p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid size-10 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <div className="mt-3">
          <StatusBadge label={label} tone={tone} />
        </div>
        <h2 className="mt-3 text-base font-semibold text-slate-950">
          {variant.title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{variant.detail}</p>
      </div>
    </div>
  );
}
