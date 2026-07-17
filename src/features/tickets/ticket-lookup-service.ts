import type { ProviderCapability } from "@/core/providers";
import {
  unsupportedTicketLookupData,
  type TicketAssignableUserLookupInput,
  type TicketLookupData,
  type TicketLookupList,
} from "@/core/ticket-lookups";
import type { TicketProviderContext } from "./connection-context";
import type { TicketMentionLookupInput } from "@/core/ticket-mentions";
import { dispatchLookupListRead } from "./provider-lookup-dispatch";

function hasCapability(
  providerContext: TicketProviderContext,
  capability: ProviderCapability,
) {
  return providerContext.plugin.capabilities.includes(capability);
}

export async function dispatchAssignableUsersRead(
  providerContext: TicketProviderContext,
  input: TicketAssignableUserLookupInput,
): Promise<TicketLookupList> {
  const supported = hasCapability(providerContext, "lookup:assignable-users");
  return dispatchLookupListRead({
    read: supported && providerContext.plugin.listAssignableUsers
      ? () => providerContext.plugin.listAssignableUsers!(
          providerContext.context,
          input,
        )
      : undefined,
  });
}

export async function dispatchMentionableUsersRead(
  providerContext: TicketProviderContext,
  input: TicketMentionLookupInput,
): Promise<TicketLookupList> {
  const supported = hasCapability(providerContext, "lookup:mentionable-users");
  return dispatchLookupListRead({
    read: supported && providerContext.plugin.listMentionableUsers
      ? () => providerContext.plugin.listMentionableUsers!(
          providerContext.context,
          input,
        )
      : undefined,
  });
}

export async function dispatchCurrentHelpdeskUserRead(
  providerContext: TicketProviderContext,
): Promise<TicketLookupList> {
  const supported = hasCapability(providerContext, "lookup:current-user");
  return dispatchLookupListRead({
    read: supported && providerContext.plugin.getCurrentUser
      ? async () => [await providerContext.plugin.getCurrentUser!(
          providerContext.context,
        )]
      : undefined,
  });
}

export async function dispatchTicketLookupDataRead(
  providerContext: TicketProviderContext,
  options: { assignableUsers?: TicketAssignableUserLookupInput | false } = {},
): Promise<TicketLookupData> {
  const canListUsers = hasCapability(providerContext, "lookup:assignable-users");
  const canGetUser = hasCapability(providerContext, "lookup:current-user");
  const canListGroups = hasCapability(providerContext, "lookup:groups");
  const canListTags = hasCapability(providerContext, "lookup:tags");
  if (!canListUsers && !canGetUser && !canListGroups && !canListTags) {
    return unsupportedTicketLookupData();
  }
  const userInput = options.assignableUsers === false
    ? undefined
    : options.assignableUsers ?? { groupExternalIds: [] };

  const [assignableUsers, currentUser, groups, tags] = await Promise.all([
    userInput
      ? dispatchAssignableUsersRead(providerContext, userInput)
      : dispatchLookupListRead({}),
    dispatchCurrentHelpdeskUserRead(providerContext),
    dispatchLookupListRead({
      read: canListGroups && providerContext.plugin.listGroups
        ? () => providerContext.plugin.listGroups!(providerContext.context)
        : undefined,
    }),
    dispatchLookupListRead({
      read: canListTags && providerContext.plugin.listTags
        ? () => providerContext.plugin.listTags!(providerContext.context)
        : undefined,
    }),
  ]);

  return { assignableUsers, currentUser, groups, tags };
}
