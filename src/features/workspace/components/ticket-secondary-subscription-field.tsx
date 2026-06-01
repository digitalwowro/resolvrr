import type { ChangeEvent } from "react";
import { cn } from "@/components/ui/classnames";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import type { SelectedTicketDraft } from "./metadata-draft";

function subscriptionLabel(detail: WorkspaceTicketDetail) {
  if (!detail.subscription.supported) {
    return "Unavailable";
  }
  return detail.subscription.following ? "Following" : "Not following";
}

function SubscriptionSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange(event: ChangeEvent<HTMLInputElement>): void;
}) {
  return (
    <label
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
        checked ? "bg-indigo-600" : "bg-slate-300",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <input
        aria-label="Subscribed"
        checked={checked}
        className="peer sr-only"
        disabled={disabled}
        onChange={onChange}
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className={cn(
          "size-4 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-4",
        )}
      />
    </label>
  );
}

export function TicketSecondarySubscriptionField({
  canEditSubscription,
  detail,
  draft,
  onDraftChange,
  saving,
}: {
  canEditSubscription: boolean;
  detail: WorkspaceTicketDetail;
  draft: SelectedTicketDraft;
  onDraftChange(nextDraft: SelectedTicketDraft): void;
  saving: boolean;
}) {
  return (
    <section aria-label="Subscription" className="space-y-1">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <span className="text-xs font-semibold">Subscribe to ticket</span>
        {canEditSubscription ? (
          <SubscriptionSwitch
            checked={draft.metadata.subscriptionFollowing === true}
            disabled={saving}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  subscriptionFollowing: event.currentTarget.checked,
                },
              })
            }
          />
        ) : (
          <SubscriptionSwitch
            checked={detail.subscription.following}
            disabled
            onChange={() => undefined}
          />
        )}
      </div>
      {!canEditSubscription ? (
        <p className="text-xs text-slate-500">{subscriptionLabel(detail)}</p>
      ) : null}
    </section>
  );
}
