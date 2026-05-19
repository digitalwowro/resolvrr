export const ticketStates = [
  "New",
  "Open",
  "Pending Reminder",
  "Pending Close",
  "Closed",
] as const;

export type TicketState = (typeof ticketStates)[number];

export const ticketPriorities = ["Low", "Medium", "High"] as const;

export type TicketPriority = (typeof ticketPriorities)[number];

export type TicketExternalId = string;

export type TicketListItem = {
  externalId: TicketExternalId;
  number: string;
  title: string;
  customerName?: string;
  ownerName?: string;
  groupName?: string;
  state?: TicketState;
  priority?: TicketPriority;
  pendingUntil?: Date;
  updatedAt: Date;
  tags: string[];
};

export type TicketThreadMessage = {
  externalId: string;
  authorName: string;
  authorRole: "agent" | "customer" | "system" | "unknown";
  createdAt: Date;
  sanitizedHtml: string;
};

export type TicketDetail = {
  ticket: TicketListItem;
  thread: TicketThreadMessage[];
  providerLinks: TicketLink[];
  subscription?: TicketSubscription;
};

export type TicketLink = {
  externalId: string;
  direction: "parent" | "child" | "related";
  label: string;
};

export type TicketSubscription = {
  supported: boolean;
  following: boolean;
};

export type TicketUpdateInput = {
  ownerExternalId?: string;
  groupExternalId?: string;
  state?: TicketState;
  priority?: TicketPriority;
  tags?: string[];
  subscriptionFollowing?: boolean;
};
