"use client";

import { useEffect, useState } from "react";
import {
  availableTicketLookupList,
  unavailableTicketLookupList,
  type TicketLookupList,
} from "@/core/ticket-lookups";
import { lookupWorkspaceAssignableUsersAction } from "@/features/tickets/lookup-actions";

export function useTicketOwnerLookup({
  groupExternalId,
  initialGroupExternalId,
  initialLookup,
}: {
  groupExternalId?: string;
  initialGroupExternalId?: string;
  initialLookup: TicketLookupList;
}) {
  const [state, setState] = useState({
    groupExternalId: initialGroupExternalId,
    loading: false,
    lookup: initialLookup,
  });

  useEffect(() => {
    if (groupExternalId === initialGroupExternalId || !groupExternalId) {
      return;
    }

    let current = true;
    void lookupWorkspaceAssignableUsersAction({
      groupExternalIds: [groupExternalId],
    })
      .then((lookup) => {
        if (current) {
          setState({ groupExternalId, loading: false, lookup });
        }
      })
      .catch(() => {
        if (current) {
          setState({
            groupExternalId,
            loading: false,
            lookup: unavailableTicketLookupList(
              "provider-temporary-failure",
              true,
            ),
          });
        }
      });
    return () => {
      current = false;
    };
  }, [groupExternalId, initialGroupExternalId, initialLookup]);

  if (groupExternalId === initialGroupExternalId || !groupExternalId) {
    return { groupExternalId, loading: false, lookup: initialLookup };
  }
  return state.groupExternalId === groupExternalId
    ? state
    : {
        groupExternalId,
        loading: true,
        lookup: availableTicketLookupList([]),
      };
}
