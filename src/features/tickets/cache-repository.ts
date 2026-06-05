import type { TicketDetail, TicketExternalId } from "@/core/tickets";

export type TicketDetailCacheReadInput = {
  encryptionKey: string;
  helpdeskConnectionId: string;
  now?: Date;
  ticketExternalId: TicketExternalId;
  userId: string;
};

export type TicketDetailCacheWriteInput = TicketDetailCacheReadInput & {
  detail: TicketDetail;
};

export type TicketDetailCacheInvalidateInput = {
  helpdeskConnectionId: string;
  ticketExternalId: TicketExternalId;
  userId: string;
};

export type TicketDetailCacheConnectionInvalidateInput = {
  helpdeskConnectionId: string;
  userId: string;
};

export type TicketDetailCacheRepository = {
  enabled: boolean;
  findFreshTicketDetail(
    input: TicketDetailCacheReadInput,
  ): Promise<TicketDetail | null>;
  storeTicketDetail(input: TicketDetailCacheWriteInput): Promise<void>;
  invalidateTicketDetail(input: TicketDetailCacheInvalidateInput): Promise<void>;
  invalidateConnection(
    input: TicketDetailCacheConnectionInvalidateInput,
  ): Promise<void>;
};

export const noTicketDetailCacheRepository: TicketDetailCacheRepository = {
  enabled: false,
  async findFreshTicketDetail() {
    return null;
  },
  async storeTicketDetail() {},
  async invalidateTicketDetail() {},
  async invalidateConnection() {},
};
