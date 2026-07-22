"use client";

import { useRef, useState } from "react";
import { CommunicationDraftCloseDialog } from "./communication-draft-close-dialog";
import {
  useWorkspaceCommunicationDraftController,
} from "./workspace-communication-draft-context";

export function useCommunicationDraftCloseGuard(
  closeTicketLocally: (ticketId: string) => void,
) {
  const [pendingTicketId, setPendingTicketId] = useState<string>();
  const forcedTicketIds = useRef(new Set<string>());
  const controller = useWorkspaceCommunicationDraftController();

  function requestClose(ticketId: string) {
    if (forcedTicketIds.current.delete(ticketId)) {
      closeTicketLocally(ticketId);
      return true;
    }
    if (controller?.hasDraft(ticketId)) {
      setPendingTicketId(ticketId);
      return false;
    }
    closeTicketLocally(ticketId);
    return true;
  }

  function dialog(closeSynchronizedTicket: (ticketId: string) => void) {
    if (!pendingTicketId) return null;
    return (
      <CommunicationDraftCloseDialog
        onCancel={() => setPendingTicketId(undefined)}
        onDiscard={() => {
          const ticketId = pendingTicketId;
          setPendingTicketId(undefined);
          void (async () => {
            const cleared = await controller?.clear(ticketId);
            if (controller && !cleared) return;
            forcedTicketIds.current.add(ticketId);
            closeSynchronizedTicket(ticketId);
          })();
        }}
        onKeep={() => {
          const ticketId = pendingTicketId;
          setPendingTicketId(undefined);
          controller?.retainLocally(ticketId);
          forcedTicketIds.current.add(ticketId);
          closeSynchronizedTicket(ticketId);
        }}
      />
    );
  }

  return { dialog, requestClose };
}
