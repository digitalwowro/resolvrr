"use client";

import { useMemo, type ReactNode } from "react";
import {
  WorkspaceCommunicationDraftProvider,
} from "./workspace-communication-draft-context";

type Props = {
  children: ReactNode;
  helpdeskConnectionId?: string;
  identityVersion?: string;
  userId?: string;
  workspaceId?: string;
};

export function WorkspaceCommunicationDraftBoundary({
  children,
  helpdeskConnectionId,
  identityVersion,
  userId,
  workspaceId,
}: Props) {
  const scope = useMemo(
    () =>
      userId && workspaceId && helpdeskConnectionId && identityVersion
        ? {
            helpdeskConnectionId,
            identityVersion,
            userId,
            workspaceId,
          }
        : undefined,
    [helpdeskConnectionId, identityVersion, userId, workspaceId],
  );
  return (
    <WorkspaceCommunicationDraftProvider scope={scope}>
      {children}
    </WorkspaceCommunicationDraftProvider>
  );
}
