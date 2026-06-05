import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import {
  defaultWorkspaceTicketColumns,
  type LoadWorkspaceTicketDetailAction,
  type SelectedTicketUpdatePayload,
  type TicketMetadataMutationActionState,
  type WorkspaceArticle,
} from "@/features/tickets";
import { TicketWorkspace } from "@/features/workspace/components/ticket-workspace";
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
  internalNotes = false,
  updateTicketMetadataAction = noopMutationAction,
  loadTicketDetailAction,
}: {
  articles?: WorkspaceArticle[];
  customerReplies?: boolean;
  internalNotes?: boolean;
  loadTicketDetailAction?: LoadWorkspaceTicketDetailAction;
  updateTicketMetadataAction?: MutationAction;
} = {}) {
  const detailProps = selectedDetailProps();
  const detail = articles ? { ...detailProps.detail, articles } : detailProps.detail;

  render(
    <TicketWorkspace
      columns={defaultWorkspaceTicketColumns}
      connections={[{ id: "connection-1", label: "Support", active: true }]}
      detail={detail}
      detailResult={{ status: "available", detail }}
      listResult={{
        ...availableList,
        communicationCapabilities: { customerReplies, internalNotes },
      }}
      loadTicketDetailAction={loadTicketDetailAction}
      logoutAction={noopAction}
      rows={[row]}
      selectedTicketId="ticket-1"
      setActiveConnectionAction={noopAction}
      tabs={[{ ...row }]}
      updateTicketMetadataAction={updateTicketMetadataAction}
      userEmail="agent@example.com"
    />,
  );
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
