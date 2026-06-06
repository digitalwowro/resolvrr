import type { TicketDetail, TicketExternalId } from "@/core/tickets";

export type TicketDetailCacheMode = "allow" | "bypass";

export type TicketDetailCacheLoadOptions = {
  cacheMode?: TicketDetailCacheMode;
};

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

export type TicketDetailCacheReadResult =
  | {
      ageBucket: string;
      detail: TicketDetail;
      status: "hit";
    }
  | {
      ageBucket?: string;
      status: "invalid-source" | "miss" | "stale";
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
  readTicketDetail(input: TicketDetailCacheReadInput): Promise<TicketDetailCacheReadResult>;
  storeTicketDetail(input: TicketDetailCacheWriteInput): Promise<void>;
  invalidateTicketDetail(input: TicketDetailCacheInvalidateInput): Promise<void>;
  invalidateConnection(
    input: TicketDetailCacheConnectionInvalidateInput,
  ): Promise<void>;
};

export const noTicketDetailCacheRepository: TicketDetailCacheRepository = {
  enabled: false,
  async readTicketDetail() {
    return { status: "miss" };
  },
  async storeTicketDetail() {},
  async invalidateTicketDetail() {},
  async invalidateConnection() {},
};
