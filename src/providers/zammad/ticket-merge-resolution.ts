import { z } from "zod";
import type { ProviderContext } from "@/core/providers";
import type { TicketDetailProviderResult } from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadGetJson } from "./client";

const historyRecordSchema = z
  .object({
    id_to: z.union([z.number(), z.string()]).nullish(),
    type: z.string().nullish(),
  })
  .passthrough();

const historyResponseSchema = z
  .object({ history: z.array(historyRecordSchema).default([]) })
  .passthrough();

function targetExternalId(value: string | number | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/u.test(normalized)) {
    return undefined;
  }
  const numeric = Number(normalized);
  return Number.isSafeInteger(numeric) && numeric > 0 ? normalized : undefined;
}

export async function resolveZammadMergedTicket(
  context: ProviderContext,
  sourceExternalId: string,
  sourceNumber?: string,
): Promise<TicketDetailProviderResult> {
  let raw: unknown;
  try {
    raw = await measureTicketReadPhase(
      "provider-merged-ticket-history-request",
      {
        connectionId: context.connection.id,
        operation: "detail",
        providerKey: context.connection.providerKey,
      },
      () =>
        zammadGetJson(
          context,
          `/api/v1/ticket_history/${encodeURIComponent(sourceExternalId)}`,
        ),
    );
  } catch {
    return {
      kind: "retired",
      cause: "merged",
      sourceExternalId,
      ...(sourceNumber ? { sourceNumber } : {}),
    };
  }
  const parsed = historyResponseSchema.safeParse(raw);
  const event = parsed.success
    ? [...parsed.data.history]
        .reverse()
        .find((record) => record.type?.toLowerCase() === "merged_into")
    : undefined;
  const target = targetExternalId(event?.id_to);
  if (!target || target === sourceExternalId) {
    return {
      kind: "retired",
      cause: "merged",
      sourceExternalId,
      ...(sourceNumber ? { sourceNumber } : {}),
    };
  }

  return {
    kind: "replaced",
    cause: "merged",
    sourceExternalId,
    ...(sourceNumber ? { sourceNumber } : {}),
    targetExternalId: target,
  };
}
