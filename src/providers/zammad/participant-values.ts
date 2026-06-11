import type { ZammadAssets, ZammadUser } from "./schemas";

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

export function isEmailLike(value: string | undefined): boolean {
  return Boolean(value && /^[^\s@]+@[^\s@]+$/u.test(value));
}

export function assetById<T>(
  assets: Record<string, T> | undefined,
  id: string | number | null | undefined,
): T | undefined {
  const key = relationId(id);
  return key ? assets?.[key] : undefined;
}

export function userByEmail(
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

type ZammadNamedReference =
  | string
  | { name?: string | null; name_last?: string | null }
  | null
  | undefined;

export function namedReferenceValue(
  value: ZammadNamedReference,
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

export function zammadUserOrganizationName(
  user: ZammadUser | undefined,
  assets?: ZammadAssets,
): string | undefined {
  return (
    namedReferenceValue(user?.organization) ??
    namedAssetValue(assets?.Organization, user?.organization_id)
  );
}
