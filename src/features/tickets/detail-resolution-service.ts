import type { TicketExternalId, TicketMergeResolution } from "@/core/tickets";
import type { TicketProviderContext } from "./connection-context";
import type {
  TicketDetailCacheLoadOptions,
  TicketDetailCacheRepository,
} from "./cache-repository";
import { dispatchTicketDetailRead } from "./provider-dispatch";
import type { TicketDetailReadResult, TicketReadUnavailable } from "./read-model";
import {
  invalidateTicketDetailCache,
  readFreshTicketDetailCache,
  storeTicketDetailCache,
} from "./service-cache";

const maxMergeResolutionHops = 10;
type ResolvedTicketDetailReadResult = Exclude<
  TicketDetailReadResult,
  { status: "replaced" }
>;

type ResolutionInput = {
  cacheRepository: TicketDetailCacheRepository;
  encryptionKey: string;
  options: TicketDetailCacheLoadOptions;
  providerContext: TicketProviderContext;
  requestedExternalId: TicketExternalId;
  userId: string;
};

function targetUnavailable(result: TicketReadUnavailable): boolean {
  return (
    result.reason === "provider-permission-denied" ||
    result.reason === "provider-unexpected-response"
  );
}

function resolutionResult(
  sources: TicketMergeResolution["sources"],
  targetExternalId: string,
): TicketMergeResolution | undefined {
  return sources.length > 0
    ? { cause: "merged", sources, targetExternalId }
    : undefined;
}

async function cachedResult(
  input: ResolutionInput,
  ticketExternalId: string,
  sources: TicketMergeResolution["sources"],
): Promise<ResolvedTicketDetailReadResult | undefined> {
  if (input.options.cacheMode === "bypass") {
    return undefined;
  }
  const detail = await readFreshTicketDetailCache({
    cacheRepository: input.cacheRepository,
    encryptionKey: input.encryptionKey,
    operation: "detail",
    providerContext: input.providerContext,
    ticketExternalId,
    userId: input.userId,
  });
  if (!detail) {
    return undefined;
  }
  return {
    status: "available",
    detail,
    resolution: resolutionResult(sources, ticketExternalId),
  };
}

async function invalidateMergedSource(
  input: ResolutionInput,
  ticketExternalId: string,
) {
  await invalidateTicketDetailCache({
    cacheRepository: input.cacheRepository,
    operation: "detail",
    providerContext: input.providerContext,
    ticketExternalId,
    userId: input.userId,
  });
}

export async function loadResolvedTicketDetail(
  input: ResolutionInput,
): Promise<ResolvedTicketDetailReadResult> {
  const visited = new Set<string>();
  const sources: TicketMergeResolution["sources"] = [];
  let currentExternalId = input.requestedExternalId;

  for (let hop = 0; hop <= maxMergeResolutionHops; hop += 1) {
    if (visited.has(currentExternalId)) {
      return {
        status: "retired",
        reason: "merged-target-unavailable",
        retryable: false,
        sourceExternalId: input.requestedExternalId,
      };
    }
    visited.add(currentExternalId);

    const cached = await cachedResult(input, currentExternalId, sources);
    if (cached) {
      return cached;
    }

    const result = await dispatchTicketDetailRead(
      input.providerContext,
      currentExternalId,
    );
    if (result.status === "available") {
      if (result.detail.ticket.state === "merged") {
        await invalidateMergedSource(input, currentExternalId);
        return {
          status: "retired",
          reason: "merged-target-unavailable",
          retryable: false,
          sourceExternalId: input.requestedExternalId,
          ...(sources[0]?.number ? { sourceNumber: sources[0].number } : {}),
        };
      }
      await storeTicketDetailCache({
        cacheRepository: input.cacheRepository,
        detail: result.detail,
        encryptionKey: input.encryptionKey,
        operation: "detail",
        providerContext: input.providerContext,
        ticketExternalId: currentExternalId,
        userId: input.userId,
      });
      return {
        ...result,
        resolution: resolutionResult(sources, currentExternalId),
      };
    }
    if (result.status === "replaced") {
      await invalidateMergedSource(input, currentExternalId);
      if (sources.length >= maxMergeResolutionHops) {
        return {
          status: "retired",
          reason: "merged-target-unavailable",
          retryable: false,
          sourceExternalId: input.requestedExternalId,
          ...(sources[0]?.number ? { sourceNumber: sources[0].number } : {}),
        };
      }
      sources.push({
        externalId: result.sourceExternalId,
        ...(result.sourceNumber ? { number: result.sourceNumber } : {}),
      });
      currentExternalId = result.targetExternalId;
      continue;
    }
    if (result.status === "retired") {
      await invalidateMergedSource(input, currentExternalId);
      return {
        ...result,
        sourceExternalId: input.requestedExternalId,
        ...(sources[0]?.number ? { sourceNumber: sources[0].number } : {}),
      };
    }
    if (sources.length > 0 && targetUnavailable(result)) {
      return {
        status: "retired",
        reason: "merged-target-unavailable",
        retryable: false,
        sourceExternalId: input.requestedExternalId,
        ...(sources[0]?.number ? { sourceNumber: sources[0].number } : {}),
      };
    }
    return result;
  }

  return {
    status: "retired",
    reason: "merged-target-unavailable",
    retryable: false,
    sourceExternalId: input.requestedExternalId,
    ...(sources[0]?.number ? { sourceNumber: sources[0].number } : {}),
  };
}
