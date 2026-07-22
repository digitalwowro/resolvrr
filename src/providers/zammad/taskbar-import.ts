import type { TicketTabImportSnapshot } from "@/core/ticket-tab-import";
import { ProviderError, type ProviderContext } from "@/core/providers";
import { zammadGetJson } from "./client";
import {
  parseZammadTaskbar,
  taskbarTicketId,
  type ZammadTaskbarItem,
} from "./taskbar-schema";

const contractVersion = "zammad-rest-desktop-ticket-tabs-v1";

function incompatible(error: unknown): never {
  if (error instanceof ProviderError && error.kind !== "provider-data-mismatch") {
    throw error;
  }
  throw new ProviderError(
    "provider-data-mismatch",
    "The helpdesk tab import contract is not compatible with this Zammad version.",
    false,
    error instanceof ProviderError ? error.statusCode : undefined,
    "tab-import-contract-unavailable",
  );
}

function orderedDesktopTickets(items: ZammadTaskbarItem[]) {
  const seen = new Set<number>();
  return items
    .filter((item) => item.app === "desktop")
    .sort((left, right) => left.prio - right.prio)
    .flatMap((item) => {
      const ticketId = taskbarTicketId(item);
      if (ticketId === null || seen.has(ticketId)) return [];
      seen.add(ticketId);
      return [ticketId];
    });
}

export async function readZammadTicketTabs(
  context: ProviderContext,
): Promise<TicketTabImportSnapshot> {
  try {
    const raw = await zammadGetJson(context, "/api/v1/taskbar");
    return {
      contractVersion,
      items: orderedDesktopTickets(parseZammadTaskbar(raw)).map(
        (ticketId, position) => ({
          position,
          ticketExternalId: String(ticketId),
        }),
      ),
    };
  } catch (error) {
    incompatible(error);
  }
}
