import {
  ticketPriorityDefinitions,
  ticketStateDefinitions,
  type TicketArticle,
  type TicketDetail,
  type TicketListItem,
} from "@/core/tickets";

export type WorkspaceTicketRow = {
  id: string;
  number: string;
  title: string;
  customer: string;
  owner: string;
  state: string;
  priority: string;
  updatedAt: string;
  preview?: string;
  providerUrl?: string;
};

export type WorkspaceArticle = {
  id: string;
  author: string;
  meta: string;
  sanitizedHtml: string;
  visibility: string;
};

export type WorkspaceTicketDetail = {
  id: string;
  number: string;
  title: string;
  customer: string;
  owner: string;
  state: string;
  priority: string;
  updatedAt: string;
  providerUrl?: string;
  articles: WorkspaceArticle[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function labelDate(date: Date | undefined): string {
  return date ? dateFormatter.format(date) : "Unknown";
}

function participantName(value: { name?: string; email?: string } | undefined) {
  return value?.name ?? value?.email ?? "Unassigned";
}

function stateLabel(ticket: TicketListItem | TicketDetail["ticket"]): string {
  return ticket.state
    ? ticketStateDefinitions[ticket.state].label
    : "Unknown";
}

function priorityLabel(ticket: TicketListItem | TicketDetail["ticket"]): string {
  return ticket.priority
    ? ticketPriorityDefinitions[ticket.priority].label
    : "Unknown";
}

function articleMeta(article: TicketArticle): string {
  return [
    article.direction,
    article.visibility,
    labelDate(article.createdAt),
  ].join(" · ");
}

export function workspaceTicketRow(ticket: TicketListItem): WorkspaceTicketRow {
  return {
    id: ticket.externalId,
    number: ticket.number,
    title: ticket.title,
    customer: participantName(ticket.customer),
    owner: participantName(ticket.owner),
    state: stateLabel(ticket),
    priority: priorityLabel(ticket),
    updatedAt: labelDate(ticket.updatedAt),
    preview: ticket.textPreview,
    providerUrl: ticket.providerUrl,
  };
}

export function workspaceTicketRows(
  tickets: TicketListItem[],
): WorkspaceTicketRow[] {
  return tickets.map(workspaceTicketRow);
}

export function workspaceTicketDetail(
  detail: TicketDetail,
): WorkspaceTicketDetail {
  return {
    ...workspaceTicketRow(detail.ticket),
    articles: detail.thread.articles.map((article) => ({
      id: article.externalId,
      author: participantName(article.author),
      meta: articleMeta(article),
      sanitizedHtml: article.sanitizedHtml,
      visibility: article.visibility,
    })),
  };
}
