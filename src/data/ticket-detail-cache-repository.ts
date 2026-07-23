import type { Prisma } from "@/generated/prisma/client";
import {
  TicketPriority as DbTicketPriority,
  TicketState as DbTicketState,
} from "@/generated/prisma/enums";
import type {
  Ticket,
  TicketArticle,
  TicketDetail,
  TicketExternalId,
  TicketPriority,
  TicketState,
  TicketSelectableState,
  TicketThread,
} from "@/core/tickets";
import type { TicketDetailCacheRepository } from "@/features/tickets/cache-repository";
import { decryptSecret, encryptSecret } from "@/security/encryption";
import { cacheAgeBucket } from "@/telemetry/cache-age-bucket";
import { prisma } from "./prisma";

const detailCacheSourceVersion = "ticket-detail-v6";
const detailCacheTtlMs = 5 * 60 * 1000;

const stateToDb: Record<TicketSelectableState, DbTicketState> = {
  closed: DbTicketState.CLOSED,
  new: DbTicketState.NEW,
  open: DbTicketState.OPEN,
  pending_close: DbTicketState.PENDING_CLOSE,
  pending_reminder: DbTicketState.PENDING_REMINDER,
};

const priorityToDb: Record<TicketPriority, DbTicketPriority> = {
  high: DbTicketPriority.HIGH,
  low: DbTicketPriority.LOW,
  medium: DbTicketPriority.MEDIUM,
};

type SerializedTicket = Omit<Ticket, "createdAt" | "pendingUntil" | "updatedAt"> & {
  createdAt?: string;
  pendingUntil?: string;
  updatedAt: string;
};

type SerializedArticle = Omit<TicketArticle, "createdAt"> & {
  createdAt: string;
};

type SerializedThread = Omit<TicketThread, "articles"> & {
  articles: SerializedArticle[];
};

type SerializedTicketDetail = Omit<
  TicketDetail,
  "lookupData" | "measuredAt" | "thread" | "ticket"
> & {
  measuredAt: string;
  thread: SerializedThread;
  ticket: SerializedTicket;
};

function serializeTicket(ticket: Ticket): SerializedTicket {
  return {
    ...ticket,
    createdAt: ticket.createdAt?.toISOString(),
    pendingUntil: ticket.pendingUntil?.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

function serializeArticle(article: TicketArticle): SerializedArticle {
  return { ...article, createdAt: article.createdAt.toISOString() };
}

function serializeTicketDetail(detail: TicketDetail): SerializedTicketDetail {
  return {
    links: detail.links,
    measuredAt: detail.measuredAt.toISOString(),
    subscription: detail.subscription,
    thread: {
      ...detail.thread,
      articles: detail.thread.articles.map(serializeArticle),
    },
    ticket: serializeTicket(detail.ticket),
  };
}

function dateFrom(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

function restoreTicket(ticket: SerializedTicket): Ticket {
  return {
    ...ticket,
    createdAt: dateFrom(ticket.createdAt),
    pendingUntil: dateFrom(ticket.pendingUntil),
    updatedAt: new Date(ticket.updatedAt),
  };
}

function restoreArticle(article: SerializedArticle): TicketArticle {
  return { ...article, createdAt: new Date(article.createdAt) };
}

function restoreTicketDetail(detail: SerializedTicketDetail): TicketDetail {
  return {
    links: detail.links,
    measuredAt: new Date(detail.measuredAt),
    subscription: detail.subscription,
    thread: {
      ...detail.thread,
      articles: detail.thread.articles.map(restoreArticle),
    },
    ticket: restoreTicket(detail.ticket),
  };
}

function dbState(state: TicketState | undefined) {
  return state && state !== "merged" ? stateToDb[state] : undefined;
}

function dbPriority(priority: TicketPriority | undefined) {
  return priority ? priorityToDb[priority] : undefined;
}

function expiresAt(now: Date) {
  return new Date(now.getTime() + detailCacheTtlMs);
}

function cacheKey(input: {
  helpdeskConnectionId: string;
  ticketExternalId: TicketExternalId;
  userId: string;
}) {
  return {
    userId_helpdeskConnectionId_providerTicketId: {
      helpdeskConnectionId: input.helpdeskConnectionId,
      providerTicketId: input.ticketExternalId,
      userId: input.userId,
    },
  };
}

export const prismaTicketDetailCacheRepository: TicketDetailCacheRepository = {
  enabled: true,

  async readTicketDetail(input) {
    const now = input.now ?? new Date();
    const cached = await prisma.ticketSnapshotCache.findUnique({
      where: cacheKey(input),
      select: {
        encryptedDetailJson: true,
        expiresAt: true,
        fetchedAt: true,
        sourceVersion: true,
      },
    });
    if (!cached?.encryptedDetailJson) {
      return { status: "miss" };
    }

    const ageBucket = cacheAgeBucket({ fetchedAt: cached.fetchedAt, now });
    if (cached.sourceVersion !== detailCacheSourceVersion) {
      return { ageBucket, status: "invalid-source" };
    }
    if (cached.expiresAt <= now) {
      return { ageBucket, status: "stale" };
    }

    const decrypted = decryptSecret(cached.encryptedDetailJson, input.encryptionKey);
    return {
      ageBucket,
      detail: restoreTicketDetail(JSON.parse(decrypted) as SerializedTicketDetail),
      status: "hit",
    };
  },

  async storeTicketDetail(input) {
    const now = input.now ?? new Date();
    const { detail } = input;
    if (detail.ticket.state === "merged") {
      return;
    }
    const encryptedDetailJson = encryptSecret(
      JSON.stringify(serializeTicketDetail(detail)),
      input.encryptionKey,
    );

    await prisma.ticketSnapshotCache.upsert({
      where: cacheKey(input),
      create: {
        capabilityJson: detail.ticket.metadataMutationConstraints
          ? detail.ticket.metadataMutationConstraints as Prisma.InputJsonValue
          : undefined,
        customerExternalId: detail.ticket.customer?.externalId,
        encryptedDetailJson,
        expiresAt: expiresAt(now),
        fetchedAt: now,
        groupExternalId: detail.ticket.group?.externalId,
        helpdeskConnectionId: input.helpdeskConnectionId,
        pendingUntil: detail.ticket.pendingUntil,
        priority: dbPriority(detail.ticket.priority),
        providerTicketId: input.ticketExternalId,
        providerUpdatedAt: detail.ticket.updatedAt,
        sourceVersion: detailCacheSourceVersion,
        state: dbState(detail.ticket.state),
        tagNamesJson: detail.ticket.tags as Prisma.InputJsonValue,
        ticketNumber: detail.ticket.number,
        title: "",
        userId: input.userId,
      },
      update: {
        capabilityJson: detail.ticket.metadataMutationConstraints
          ? detail.ticket.metadataMutationConstraints as Prisma.InputJsonValue
          : undefined,
        customerExternalId: detail.ticket.customer?.externalId,
        encryptedDetailJson,
        expiresAt: expiresAt(now),
        fetchedAt: now,
        groupExternalId: detail.ticket.group?.externalId,
        pendingUntil: detail.ticket.pendingUntil,
        priority: dbPriority(detail.ticket.priority),
        providerUpdatedAt: detail.ticket.updatedAt,
        sourceVersion: detailCacheSourceVersion,
        state: dbState(detail.ticket.state),
        tagNamesJson: detail.ticket.tags as Prisma.InputJsonValue,
        ticketNumber: detail.ticket.number,
        title: "",
      },
    });
  },

  async invalidateTicketDetail(input) {
    await prisma.ticketSnapshotCache.deleteMany({
      where: {
        helpdeskConnectionId: input.helpdeskConnectionId,
        providerTicketId: input.ticketExternalId,
        userId: input.userId,
      },
    });
  },

  async invalidateConnection(input) {
    await prisma.ticketSnapshotCache.deleteMany({
      where: {
        helpdeskConnectionId: input.helpdeskConnectionId,
        userId: input.userId,
      },
    });
  },
};
