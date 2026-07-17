import { z } from "zod";
import { ProviderError } from "@/core/providers";

const positiveInteger = z.coerce.number().int().positive();

const zammadTaskbarItemSchema = z.object({
  id: positiveInteger,
  key: z.string(),
  callback: z.string(),
  params: z.record(z.string(), z.unknown()).default({}),
  prio: z.coerce.number().int(),
  active: z.boolean(),
  updated_at: z.coerce.date(),
}).passthrough();

export type ZammadTaskbarItem = z.infer<typeof zammadTaskbarItemSchema>;

function mismatch(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk taskbar contract is not compatible with this Zammad version.",
    false,
    undefined,
    "taskbar-contract-mismatch",
  );
}

export function parseZammadTaskbar(raw: unknown): ZammadTaskbarItem[] {
  const parsed = z.array(zammadTaskbarItemSchema).safeParse(raw);
  if (!parsed.success) throw mismatch();
  return parsed.data;
}

export function taskbarTicketId(item: ZammadTaskbarItem): number | null {
  if (item.callback !== "TicketZoom") return null;
  const keyMatch = /^Ticket-(\d+)$/u.exec(item.key);
  const parameter = positiveInteger.safeParse(item.params.ticket_id);
  if (!keyMatch || !parameter.success || Number(keyMatch[1]) !== parameter.data) {
    throw mismatch();
  }
  return parameter.data;
}
