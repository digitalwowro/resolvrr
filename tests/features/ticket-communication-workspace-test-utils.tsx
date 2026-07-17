import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type {
  AiRephraseStyleOption,
  RewriteDraftAction,
} from "@/features/ai";
import {
  defaultWorkspaceTicketColumns,
  type LoadWorkspaceTicketDetailAction,
  type SelectedTicketUpdatePayload,
  type TicketMetadataMutationActionState,
  type WorkspaceArticle,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
import {
  WorkspaceSignatureActionsProvider,
  type WorkspaceSignatureActions,
} from "@/features/workspace/components/ticket-signature-preview-action-context";
import {
  availableList,
  noopAction,
  noopMutationAction,
  row,
  selectedDetailProps,
} from "./ticket-workspace-test-utils";

export const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: vi.fn(),
  }),
}));

export type MutationAction = (
  request: SelectedTicketUpdatePayload,
) => Promise<TicketMetadataMutationActionState>;

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

export function renderWorkspace({
  articles,
  customerReplies = false,
  customerForwards = false,
  internalNotes = false,
  metadataPriority = false,
  updateTicketMetadataAction = noopMutationAction,
  loadTicketDetailAction,
  rephraseStyleOptions,
  rewriteDraftAction,
  providerManagedAddresses,
  userId,
  workspaceId = "connection-1",
  helpdeskConnectionId = "personal-connection-1",
  identityVersion = "identity-v1",
  signatureActions,
}: {
  articles?: WorkspaceArticle[];
  customerReplies?: boolean;
  customerForwards?: boolean;
  internalNotes?: boolean;
  metadataPriority?: boolean;
  loadTicketDetailAction?: LoadWorkspaceTicketDetailAction;
  rephraseStyleOptions?: AiRephraseStyleOption[];
  rewriteDraftAction?: RewriteDraftAction;
  providerManagedAddresses?: string[];
  updateTicketMetadataAction?: MutationAction;
  userId?: string;
  workspaceId?: string;
  helpdeskConnectionId?: string;
  identityVersion?: string;
  signatureActions?: WorkspaceSignatureActions;
} = {}) {
  const detailProps = selectedDetailProps();
  const detail = {
    ...detailProps.detail,
    ...(articles ? { articles } : {}),
    ...(providerManagedAddresses
      ? { replyPolicy: { providerManagedAddresses } }
      : {}),
  };

  const workspace = (
    <TicketWorkspace
      columns={defaultWorkspaceTicketColumns}
      connections={[{
        id: workspaceId,
        label: "Support",
        active: true,
        connectionId: helpdeskConnectionId,
        identityVersion,
      }]}
      detail={detail}
      detailResult={{ status: "available", detail }}
      listResult={{
        ...availableList,
        communicationCapabilities: { customerForwards, customerReplies, internalNotes },
        metadataMutationCapabilities: {
          ...availableList.metadataMutationCapabilities,
          priority: metadataPriority,
        },
      }}
      loadTicketDetailAction={loadTicketDetailAction}
      logoutAction={noopAction}
      rows={[row]}
      rephraseStyleOptions={rephraseStyleOptions}
      selectedTicketId="ticket-1"
      setActiveConnectionAction={noopAction}
      tabs={[{ ...row }]}
      updateTicketMetadataAction={updateTicketMetadataAction}
      rewriteDraftAction={rewriteDraftAction}
      userEmail="agent@example.com"
      userId={userId}
    />
  );
  render(signatureActions ? (
    <WorkspaceSignatureActionsProvider actions={signatureActions}>
      {workspace}
    </WorkspaceSignatureActionsProvider>
  ) : workspace);
}

export function internalArticle(): WorkspaceArticle {
  return {
    id: "article-internal-ticket-1",
    author: "Agent Smith",
    authorEmail: "agent@example.com",
    from: { label: "Agent Smith", email: "agent@example.com" },
    to: [],
    cc: [],
    bcc: [],
    direction: "internal",
    meta: "May 24, 08:34",
    sanitizedHtml: "<p>Private investigation note.</p>",
    visibility: "internal",
    attachments: [],
  };
}

export function getCustomerArticle() {
  return screen.getByRole("article", {
    name: "Customer reply from Maya Patel",
  });
}
