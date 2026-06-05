import type { AiSummaryCacheRepository } from "./summary-cache-repository";

export async function invalidateAiSummaryTicketCache(input: {
  cacheRepository: AiSummaryCacheRepository;
  helpdeskConnectionId: string;
  ticketExternalId: string;
  userId: string;
}): Promise<void> {
  if (!input.cacheRepository.enabled) {
    return;
  }

  try {
    await input.cacheRepository.invalidateTicket({
      helpdeskConnectionId: input.helpdeskConnectionId,
      ticketExternalId: input.ticketExternalId,
      userId: input.userId,
    });
  } catch {
    return;
  }
}

export async function invalidateAiSummaryConnectionCache(input: {
  cacheRepository: AiSummaryCacheRepository;
  helpdeskConnectionId: string;
  userId: string;
}): Promise<void> {
  if (!input.cacheRepository.enabled) {
    return;
  }

  try {
    await input.cacheRepository.invalidateConnection({
      helpdeskConnectionId: input.helpdeskConnectionId,
      userId: input.userId,
    });
  } catch {
    return;
  }
}

export async function invalidateAiSummaryWorkspaceCache(input: {
  cacheRepository: AiSummaryCacheRepository;
  helpdeskConnectionId: string;
}): Promise<void> {
  if (!input.cacheRepository.enabled) {
    return;
  }

  try {
    await input.cacheRepository.invalidateWorkspace({
      helpdeskConnectionId: input.helpdeskConnectionId,
    });
  } catch {
    return;
  }
}
