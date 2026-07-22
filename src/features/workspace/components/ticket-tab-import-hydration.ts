import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import type { HydrateWorkspaceTabImportAction } from "@/features/tab-import/model";
import type {
  TicketReadUnavailable,
  TicketReadUnavailableReason,
} from "@/features/tickets/read-model";
import { workspaceTabFromDetail } from "@/features/workspace/workspace-tab-state";

const hydrationConcurrency = 4;
const maximumCandidates = 100;

const importWideFailureReasons = new Set<TicketReadUnavailableReason>([
  "no-active-connection",
  "inactive-connection",
  "missing-credentials",
  "personal-connection-required",
  "unknown-provider",
  "unsupported-capability",
  "provider-auth-failed",
  "provider-rate-limited",
  "provider-temporary-failure",
  "invalid-connection",
]);

type TicketTabHydrationResult = {
  attemptedCount: number;
  duplicateCount: number;
  failure?: TicketReadUnavailable;
  scanLimitSkippedCount: number;
  tabs: WorkspaceTicketTab[];
  unavailableCount: number;
};

function importWideFailure(
  result: Awaited<ReturnType<HydrateWorkspaceTabImportAction>>,
): TicketReadUnavailable | undefined {
  return result.status === "unavailable" &&
      importWideFailureReasons.has(result.reason)
    ? result
    : undefined;
}

export async function hydrateImportedTicketTabs({
  candidateTicketIds,
  capacity,
  hydrationScope,
  knownTicketIds,
  hydrateAction,
  shouldContinue = () => true,
}: {
  candidateTicketIds: string[];
  capacity: number;
  hydrationScope: {
    helpdeskConnectionId: string;
    identityVersion: string;
    workspaceId: string;
  };
  knownTicketIds: Set<string>;
  hydrateAction: HydrateWorkspaceTabImportAction;
  shouldContinue?: () => boolean;
}): Promise<TicketTabHydrationResult> {
  const uniqueCandidates = [...new Set(candidateTicketIds)];
  const candidates = uniqueCandidates.slice(0, maximumCandidates);
  const scanLimitSkippedCount = uniqueCandidates.length - candidates.length;
  const imported: WorkspaceTicketTab[] = [];
  const importedIds = new Set(knownTicketIds);
  let attemptedCount = 0;
  let duplicateCount = 0;
  let failure: TicketReadUnavailable | undefined;
  let unavailableCount = 0;

  let cursor = 0;
  while (
    cursor < candidates.length &&
    imported.length < capacity &&
    shouldContinue()
  ) {
    const remainingCapacity = capacity - imported.length;
    const batchSize = Math.min(hydrationConcurrency, remainingCapacity);
    const batch = candidates.slice(cursor, cursor + batchSize);
    cursor += batch.length;
    attemptedCount += batch.length;
    const results = await Promise.all(
      batch.map((ticketExternalId) => hydrateAction({
        ...hydrationScope,
        ticketExternalId,
      })),
    );
    if (!shouldContinue()) break;
    for (const result of results) {
      const batchFailure = importWideFailure(result);
      if (batchFailure) {
        failure ??= batchFailure;
        continue;
      }
      if (result.status !== "available") {
        unavailableCount += 1;
        continue;
      }
      const tab = workspaceTabFromDetail(result.detail);
      if (importedIds.has(tab.id)) {
        duplicateCount += 1;
        continue;
      }
      importedIds.add(tab.id);
      imported.push(tab);
      if (imported.length >= capacity) break;
    }
    if (failure) break;
  }

  return {
    attemptedCount,
    duplicateCount,
    failure,
    scanLimitSkippedCount,
    tabs: imported,
    unavailableCount,
  };
}
