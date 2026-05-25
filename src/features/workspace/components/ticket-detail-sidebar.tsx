"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownSelect,
  type DropdownOption,
} from "@/components/ui";
import {
  ticketPriorities,
  ticketPriorityDefinitions,
  type TicketPriority,
  type TicketState,
} from "@/core/tickets";
import type {
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
  TicketMetadataMutationField,
  WorkspaceTicketDetail,
} from "@/features/tickets";
import {
  PriorityCell,
  PriorityIcon,
  StateCell,
} from "./ticket-table-cells";
import {
  defaultPendingDateTimeParts,
  isFuturePendingDateTime,
  pendingDateTimeIso,
  type PendingDateTimeParts,
  TicketPendingStateForm,
} from "./ticket-pending-state-form";
import {
  selectedStateDisplay,
  stateMutationLabel,
  stateOptionsFor,
  stateRequiresPendingDate,
} from "./ticket-state-mutation-options";

const priorityOptions: DropdownOption[] = ticketPriorities.map((priority) => ({
  value: priority,
  label: ticketPriorityDefinitions[priority].label,
  icon: <PriorityIcon priority={priority} />,
}));

function SidebarField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="block w-full space-y-1">
      <span className="block text-xs font-semibold">{label}</span>
      <div className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        {children}
      </div>
    </div>
  );
}

function EditableSidebarField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block w-full space-y-1">
      <span className="block text-xs font-semibold">{label}</span>
      {children}
    </label>
  );
}

function mutationStatusText(
  pendingField: TicketMetadataMutationField | undefined,
  result: TicketMetadataMutationActionState,
) {
  if (pendingField) {
    return `Saving ${pendingField}...`;
  }
  if (
    result.status === "failed" ||
    result.status === "saved-refresh-failed"
  ) {
    return result.message;
  }
  return undefined;
}

export function TicketDetailSidebar({
  detail,
  metadataMutationCapabilities = { state: false, priority: false },
  updateTicketMetadataAction,
}: {
  detail: WorkspaceTicketDetail;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  updateTicketMetadataAction(
    formData: FormData,
  ): Promise<TicketMetadataMutationActionState>;
}) {
  const router = useRouter();
  const [pendingField, setPendingField] =
    useState<TicketMetadataMutationField>();
  const [mutationResult, setMutationResult] =
    useState<TicketMetadataMutationActionState>({ status: "idle" });
  const [pendingStateDraft, setPendingStateDraft] = useState<TicketState>();
  const [pendingDateTime, setPendingDateTime] = useState(
    defaultPendingDateTimeParts,
  );
  const statusText = mutationStatusText(pendingField, mutationResult);
  const availableStateOptions = stateOptionsFor(detail);
  const displayedState = pendingStateDraft ?? detail.stateKey;
  const stateDisplay = selectedStateDisplay(displayedState);

  function saveMetadata(
    field: TicketMetadataMutationField,
    value: TicketState | TicketPriority,
    currentValue: TicketState | TicketPriority | undefined,
    extra?: { pendingUntil?: string },
  ) {
    if (pendingField || value === currentValue) {
      return;
    }

    const formData = new FormData();
    formData.set("ticketExternalId", detail.id);
    formData.set("field", field);
    formData.set("value", value);
    if (extra?.pendingUntil) {
      formData.set("pendingUntil", extra.pendingUntil);
    }
    setPendingField(field);
    setMutationResult({ status: "idle" });

    void updateTicketMetadataAction(formData)
      .then((result) => {
        setMutationResult(result);
        if (result.status === "saved") {
          setPendingStateDraft(undefined);
          router.refresh();
        }
      })
      .catch(() => {
        setMutationResult({
          status: "failed",
          field,
          message: "The ticket could not be updated. Try again.",
        });
      })
      .finally(() => setPendingField(undefined));
  }

  function handleStateChange(value: string) {
    const state = value as TicketState;
    if (stateRequiresPendingDate(detail, state)) {
      setPendingStateDraft(state);
      setPendingDateTime(defaultPendingDateTimeParts());
      setMutationResult({ status: "idle" });
      return;
    }

    setPendingStateDraft(undefined);
    saveMetadata("state", state, detail.stateKey);
  }

  function savePendingState(value: PendingDateTimeParts) {
    if (!pendingStateDraft) {
      return;
    }
    if (!isFuturePendingDateTime(value)) {
      setMutationResult({
        status: "failed",
        field: "state",
        message: "Choose a future pending date and time.",
      });
      return;
    }

    const pendingUntil = pendingDateTimeIso(value);
    if (!pendingUntil) {
      setMutationResult({
        status: "failed",
        field: "state",
        message: "Choose a future pending date and time.",
      });
      return;
    }

    saveMetadata("state", pendingStateDraft, detail.stateKey, { pendingUntil });
  }

  function handlePendingDateTimeChange(value: PendingDateTimeParts) {
    setPendingDateTime(value);
    savePendingState(value);
  }

  return (
    <aside className="w-56 shrink-0 space-y-4 border-l border-slate-200 px-3 py-3">
      {metadataMutationCapabilities.state ? (
        <EditableSidebarField label="State">
          <DropdownSelect
            ariaLabel="Ticket state"
            className="block w-full [&>div]:w-full"
            disabled={Boolean(pendingField)}
            onValueChange={handleStateChange}
            options={availableStateOptions}
            selectedDisplay={stateDisplay}
            triggerClassName="w-full"
            value={displayedState}
          />
          {pendingStateDraft ? (
            <div className="mt-2">
              <TicketPendingStateForm
                disabled={Boolean(pendingField)}
                onChange={handlePendingDateTimeChange}
                stateLabel={stateMutationLabel(pendingStateDraft)}
                value={pendingDateTime}
              />
            </div>
          ) : null}
        </EditableSidebarField>
      ) : (
        <SidebarField label="State">
          <StateCell label={detail.state} state={detail.stateKey} />
        </SidebarField>
      )}
      {metadataMutationCapabilities.priority ? (
        <EditableSidebarField label="Priority">
          <DropdownSelect
            ariaLabel="Ticket priority"
            className="block w-full [&>div]:w-full"
            disabled={Boolean(pendingField)}
            onValueChange={(value) =>
              saveMetadata("priority", value as TicketPriority, detail.priorityKey)
            }
            options={priorityOptions}
            triggerClassName="w-full"
            value={detail.priorityKey}
          />
        </EditableSidebarField>
      ) : (
        <SidebarField label="Priority">
          <PriorityCell label={detail.priority} priority={detail.priorityKey} />
        </SidebarField>
      )}
      {statusText ? (
        <p
          className={
            mutationResult.status === "failed" ||
            mutationResult.status === "saved-refresh-failed"
              ? "text-xs text-amber-700"
              : "text-xs text-slate-600"
          }
          role={pendingField ? "status" : "alert"}
        >
          {statusText}
        </p>
      ) : null}
      <SidebarField label="Group">
        <span>{detail.group}</span>
      </SidebarField>
      <SidebarField label="Pending till">
        <span>{detail.pendingTill}</span>
      </SidebarField>
      <SidebarField label="Tags">
        <span>{detail.tags.length > 0 ? detail.tags.join(", ") : "-"}</span>
      </SidebarField>
    </aside>
  );
}
