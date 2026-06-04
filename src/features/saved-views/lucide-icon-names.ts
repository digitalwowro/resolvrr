import { existsSync } from "node:fs";
import { join } from "node:path";
import { curatedSavedViewIconNames } from "@/core/saved-views";

const curatedIconNames = new Set<string>(curatedSavedViewIconNames);

function lucideIconFileExists(iconName: string): boolean {
  return existsSync(
    join(
      process.cwd(),
      "node_modules",
      "lucide-react",
      "dist",
      "esm",
      "icons",
      `${iconName}.mjs`,
    ),
  );
}

export function normalizeLucideIconName(value: string): string | undefined {
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.includes("://") ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("<") ||
    trimmed.includes(">")
  ) {
    return undefined;
  }

  const kebab = trimmed
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[_\s]+/gu, "-")
    .toLocaleLowerCase();

  return curatedIconNames.has(kebab) || lucideIconFileExists(kebab)
    ? kebab
    : undefined;
}

export function isValidLucideIconName(value: string): boolean {
  return normalizeLucideIconName(value) !== undefined;
}
