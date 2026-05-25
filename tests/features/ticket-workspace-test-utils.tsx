import type {
  TicketListReadResult,
  WorkspaceTicketDetail,
  WorkspaceTicketDetailLoadResult,
  WorkspaceTicketRow,
} from "@/features/tickets";

export async function noopAction() {}

export async function noopMutationAction() {
  return { status: "idle" as const };
}

export const availableList = {
  status: "available",
  connectionName: "Support",
  metadataMutationCapabilities: { state: false, priority: false },
  tickets: [],
  loadedCount: 0,
  measuredAt: new Date("2026-05-24T00:00:00Z"),
} satisfies TicketListReadResult;

export const row = {
  id: "ticket-1",
  number: "#1001",
  title: "Cannot log in",
  customer: "Maya Patel",
  owner: "Agent Smith",
  group: "Users",
  state: "Open",
  stateKey: "open",
  priority: "Medium",
  priorityKey: "medium",
  pendingTill: "-",
  updatedAt: "May 24, 08:30",
  preview: "Hello there",
} satisfies WorkspaceTicketRow;

export const highRow = {
  ...row,
  id: "ticket-2",
  number: "#1002",
  title: "Webhook failed",
  customer: "Unassigned",
  owner: "Unassigned",
  group: "Unassigned",
  priority: "High",
  priorityKey: "high",
} satisfies WorkspaceTicketRow;

export function detailPropsFor(
  ticket: WorkspaceTicketRow = row,
  articleBody = "Hello there",
): {
  detail: WorkspaceTicketDetail;
  detailResult: WorkspaceTicketDetailLoadResult;
} {
  return {
    detail: {
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
      customer: ticket.customer,
      owner: ticket.owner,
      group: ticket.group,
      state: ticket.state,
      stateKey: ticket.stateKey,
      priority: ticket.priority,
      priorityKey: ticket.priorityKey,
      pendingTill: ticket.pendingTill,
      updatedAt: ticket.updatedAt,
      tags: [],
      articles: [
        {
          id: `article-${ticket.id}`,
          author: ticket.customer,
          authorEmail: "maya@example.com",
          from: { label: ticket.customer, email: "maya@example.com" },
          to: [{ label: "Support Team", email: "support@example.com" }],
          cc: [],
          bcc: [],
          direction: "inbound",
          meta: "May 24, 08:31",
          sanitizedHtml: `<p>${articleBody}</p>`,
          visibility: "public",
        },
      ],
    },
    detailResult: {
      status: "available",
      detail: {
        id: ticket.id,
        number: ticket.number,
        title: ticket.title,
        customer: ticket.customer,
        owner: ticket.owner,
        group: ticket.group,
        state: ticket.state,
        stateKey: ticket.stateKey,
        priority: ticket.priority,
        priorityKey: ticket.priorityKey,
        pendingTill: ticket.pendingTill,
        updatedAt: ticket.updatedAt,
        tags: [],
        articles: [
          {
            id: `article-${ticket.id}`,
            author: ticket.customer,
            authorEmail: "maya@example.com",
            from: { label: ticket.customer, email: "maya@example.com" },
            to: [{ label: "Support Team", email: "support@example.com" }],
            cc: [],
            bcc: [],
            direction: "inbound",
            meta: "May 24, 08:31",
            sanitizedHtml: `<p>${articleBody}</p>`,
            visibility: "public",
          },
        ],
      },
    },
  };
}

export function selectedDetailProps() {
  return detailPropsFor();
}
