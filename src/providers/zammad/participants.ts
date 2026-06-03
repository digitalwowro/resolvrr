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

export function cleanString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "-") {
    return undefined;
  }

  return trimmed;
}

export function relationId(
  value: string | number | null | undefined,
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return String(value);
}

function isEmailLike(value: string | undefined): boolean {
  return Boolean(value && /^[^\s@]+@[^\s@]+$/u.test(value));
}

function assetById<T>(
  assets: Record<string, T> | undefined,
  id: string | number | null | undefined,
): T | undefined {
  const key = relationId(id);
  return key ? assets?.[key] : undefined;
}

function userByEmail(
  assets: ZammadAssets | undefined,
  email: string | undefined,
): ZammadUser | undefined {
  const normalizedEmail = email?.toLowerCase();
  if (!normalizedEmail) {
    return undefined;
  }

  return Object.values(assets?.User ?? {}).find((user) => {
    const userMail = zammadUserEmail(user)?.toLowerCase();
    return userMail === normalizedEmail;
  });
}

export function namedReferenceValue(
  value: ZammadTicket["group"] | ZammadTicket["state"] | ZammadTicket["priority"],
): string | undefined {
  if (typeof value === "string") {
    return cleanString(value);
  }

  return cleanString(value?.name) ?? cleanString(value?.name_last);
}

export function namedAssetValue(
  assets: Record<string, { name?: string | null } | undefined> | undefined,
  id: string | number | null | undefined,
): string | undefined {
  return cleanString(assetById(assets, id)?.name);
}

export function zammadUserDisplayName(
  user: ZammadUser | undefined,
): string | undefined {
  const explicitName =
    cleanString(user?.fullname) ??
    cleanString(user?.name) ??
    cleanString(user?.display_name) ??
    cleanString(user?.displayName);
  if (explicitName && !isEmailLike(explicitName)) {
    return explicitName;
  }

  const joinedName = [cleanString(user?.firstname), cleanString(user?.lastname)]
    .filter(Boolean)
    .join(" ");
  if (joinedName && !isEmailLike(joinedName)) {
    return joinedName;
  }

  return undefined;
}

export function zammadUserEmail(
  user: ZammadUser | undefined,
): string | undefined {
  const email = cleanString(user?.email);
  if (email) {
    return email;
  }

  const login = cleanString(user?.login);
  return isEmailLike(login) ? login : undefined;
}

function participantFromUser(
  user: ZammadUser | undefined,
  role: TicketParticipantRole,
): TicketParticipant | undefined {
  const name = zammadUserDisplayName(user) ?? zammadUserEmail(user);
  if (!name) {
    return undefined;
  }

  return {
    externalId: relationId(user?.id),
    name,
    email: zammadUserEmail(user),
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
  role,
}: {
  assets?: ZammadAssets;
  fallback: ZammadTicket["customer"] | ZammadTicket["owner"];
  id: string | number | null | undefined;
  role: TicketParticipantRole;
}): TicketParticipant | undefined {
  const assetParticipant = participantFromUser(
    assetById(assets?.User, id),
    role,
  );
  if (assetParticipant) {
    return assetParticipant;
  }

  const referenceParticipant = participantFromUser(userReference(fallback), role);
  if (referenceParticipant) {
    return referenceParticipant;
  }

  if (typeof fallback !== "string") {
    return undefined;
  }

  const parsed = addressParts(fallback);
  const name = parsed.name ?? parsed.email;
  return name
    ? { externalId: relationId(id), name, email: parsed.email, role }
    : undefined;
}

export function articleAuthor(
  article: ZammadArticle,
  assets: ZammadAssets | undefined,
  role: TicketParticipantRole,
): TicketParticipant {
  const createdByUser = assetById(assets?.User, article.created_by_id);
  const assetParticipant = participantFromUser(createdByUser, role);
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
  );
  if (assetParticipant) {
    return assetParticipant;
  }

  return {
    name: parsed.name ?? parsed.email ?? "Unknown",
    email: parsed.email,
  };
}
