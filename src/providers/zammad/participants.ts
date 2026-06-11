import type {
  TicketParticipant,
  TicketParticipantRole,
} from "@/core/tickets";
import type {
  ZammadArticle,
  ZammadAssets,
  ZammadTicket,
  ZammadUser,
} from "./schemas";
import {
  assetById,
  cleanString,
  isEmailLike,
  relationId,
  userByEmail,
  zammadUserDisplayName,
  zammadUserEmail,
  zammadUserOrganizationName,
} from "./participant-values";

export {
  cleanString,
  namedAssetValue,
  namedReferenceValue,
  relationId,
  zammadUserDisplayName,
  zammadUserEmail,
  zammadUserOrganizationName,
} from "./participant-values";

function participantFromUser(
  user: ZammadUser | undefined,
  role: TicketParticipantRole,
  assets?: ZammadAssets,
): TicketParticipant | undefined {
  const name = zammadUserDisplayName(user) ?? zammadUserEmail(user);
  if (!name) {
    return undefined;
  }

  const organization = zammadUserOrganizationName(user, assets);
  return {
    externalId: relationId(user?.id),
    name,
    email: zammadUserEmail(user),
    ...(organization ? { organization } : {}),
    role,
  };
}

function participantFromAddress(
  value: string | null | undefined,
  role: TicketParticipantRole,
  externalId?: string,
): TicketParticipant | undefined {
  const parsed = addressParts(value);
  const name = parsed.name ?? parsed.email;
  return name
    ? { externalId, name, email: parsed.email, role }
    : undefined;
}

function userReference(
  value: ZammadTicket["customer"] | ZammadTicket["owner"] | ZammadArticle["created_by"],
): ZammadUser | undefined {
  return typeof value === "object" && value !== null ? value : undefined;
}

function addressParts(value: string | null | undefined): {
  email?: string;
  name?: string;
} {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return {};
  }

  const match = cleaned.match(/^(?<name>.*?)\s*<(?<email>[^>]+)>$/u);
  const email = cleanString(match?.groups?.email);
  const name = cleanString(match?.groups?.name?.replace(/^"|"$/gu, ""));
  if (match) {
    return {
      email,
      name: name && !isEmailLike(name) ? name : undefined,
    };
  }

  if (isEmailLike(cleaned)) {
    return { email: cleaned };
  }

  return { name: cleaned };
}

export function participantFromReference({
  assets,
  fallback,
  id,
  organization,
  role,
}: {
  assets?: ZammadAssets;
  fallback: ZammadTicket["customer"] | ZammadTicket["owner"];
  id: string | number | null | undefined;
  organization?: string;
  role: TicketParticipantRole;
}): TicketParticipant | undefined {
  const withOrganization = (
    participant: TicketParticipant | undefined,
  ): TicketParticipant | undefined => {
    if (!participant || !organization || participant.organization) {
      return participant;
    }
    return { ...participant, organization };
  };

  const assetParticipant = participantFromUser(
    assetById(assets?.User, id),
    role,
    assets,
  );
  if (assetParticipant) {
    return withOrganization(assetParticipant);
  }

  const referenceParticipant = participantFromUser(
    userReference(fallback),
    role,
    assets,
  );
  if (referenceParticipant) {
    return withOrganization(referenceParticipant);
  }

  if (typeof fallback !== "string") {
    return undefined;
  }

  const parsed = addressParts(fallback);
  const name = parsed.name ?? parsed.email;
  return name
    ? {
        externalId: relationId(id),
        name,
        email: parsed.email,
        ...(organization ? { organization } : {}),
        role,
      }
    : undefined;
}

export function articleAuthor(
  article: ZammadArticle,
  assets: ZammadAssets | undefined,
  role: TicketParticipantRole,
): TicketParticipant {
  const createdByUser = assetById(assets?.User, article.created_by_id);
  const assetParticipant = participantFromUser(createdByUser, role, assets);
  const fromParticipant = participantFromAddress(article.from, role);
  const outboundEmail =
    !article.internal && article.sender?.toLowerCase().includes("agent");

  if (outboundEmail && fromParticipant) {
    const fromEmail = fromParticipant.email?.toLowerCase();
    const createdByEmail = zammadUserEmail(createdByUser)?.toLowerCase();
    const sameCreatedByEmail = fromEmail && createdByEmail === fromEmail;

    if (!sameCreatedByEmail || fromParticipant.name !== fromParticipant.email) {
      return sameCreatedByEmail && assetParticipant
        ? { ...fromParticipant, externalId: assetParticipant.externalId }
        : fromParticipant;
    }
  }

  if (assetParticipant) {
    return assetParticipant;
  }

  const referenceParticipant = participantFromUser(
    userReference(article.created_by),
    role,
    assets,
  );
  if (referenceParticipant) {
    return referenceParticipant;
  }

  const createdBy = typeof article.created_by === "string"
    ? addressParts(article.created_by)
    : {};
  const name = createdBy.name ??
    fromParticipant?.name ??
    createdBy.email ??
    fromParticipant?.email;
  return {
    name: name ?? "Unknown",
    email: fromParticipant?.email ?? createdBy.email,
    role,
  };
}

export function recipientParticipant(
  value: string,
  assets?: ZammadAssets,
): TicketParticipant {
  const parsed = addressParts(value);
  const assetParticipant = participantFromUser(
    userByEmail(assets, parsed.email),
    "unknown",
    assets,
  );
  if (assetParticipant) {
    return assetParticipant;
  }

  return {
    name: parsed.name ?? parsed.email ?? "Unknown",
    email: parsed.email,
  };
}
