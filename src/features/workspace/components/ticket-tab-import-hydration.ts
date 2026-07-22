import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import type { LoadWorkspaceTicketDetailHydrationAction } from "@/features/workspace/ticket-detail-hydration";
import { workspaceTabFromDetail } from "@/features/workspace/workspace-tab-state";

const hydrationConcurrency = 4;
const maximumCandidates = 100;

export type TicketTabHydrationResult = {
  attemptedCount: number;
  tabs: WorkspaceTicketTab[];
  unavailableCount: number;
};

export async function hydrateImportedTicketTabs({
  candidateTicketIds,
  capacity,
  knownTicketIds,
  loadTicketDetailAction,
}: {
  candidateTicketIds: string[];
  capacity: number;
  knownTicketIds: Set<string>;
  loadTicketDetailAction: LoadWorkspaceTicketDetailHydrationAction;
}): Promise<TicketTabHydrationResult> {
  const candidates = [...new Set(candidateTicketIds)].slice(0, maximumCandidates);
  const imported: WorkspaceTicketTab[] = [];
  const importedIds = new Set(knownTicketIds);
  let attemptedCount = 0;
  let unavailableCount = 0;

  let cursor = 0;
  while (cursor < candidates.length && imported.length < capacity) {
    const remainingCapacity = capacity - imported.length;
    const batchSize = Math.min(hydrationConcurrency, remainingCapacity);
    const batch = candidates.slice(cursor, cursor + batchSize);
    cursor += batch.length;
    attemptedCount += batch.length;
    const results = await Promise.all(
      batch.map((ticketId) => loadTicketDetailAction(ticketId)),
    );
    for (const result of results) {
      if (result.status !== "available") {
        unavailableCount += 1;
        continue;
      }
      const tab = workspaceTabFromDetail(result.detail);
      if (importedIds.has(tab.id)) continue;
      importedIds.add(tab.id);
      imported.push(tab);
      if (imported.length >= capacity) break;
    }
  }

  return { attemptedCount, tabs: imported, unavailableCount };
}
