export type TicketTabImportItem = {
  position: number;
  ticketExternalId: string;
};

export type TicketTabImportSnapshot = {
  contractVersion: string;
  items: TicketTabImportItem[];
};
