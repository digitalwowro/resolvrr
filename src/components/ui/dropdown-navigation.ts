import type { DropdownOption } from "./dropdown-types";

export function firstEnabledIndex(options: DropdownOption[]): number {
  return options.findIndex((option) => !option.disabled);
}

export function selectedOptionIndex(
  options: DropdownOption[],
  value: string | undefined,
): number {
  return options.findIndex((option) => option.value === value && !option.disabled);
}

export function enabledOptionIndexes(options: DropdownOption[]): number[] {
  return options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);
}

export function nextEnabledIndex(
  options: DropdownOption[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  const enabled = enabledOptionIndexes(options);
  if (enabled.length === 0) {
    return -1;
  }

  const currentPosition = enabled.indexOf(currentIndex);
  if (currentPosition === -1) {
    return direction === 1 ? enabled[0] : enabled[enabled.length - 1];
  }

  const nextPosition =
    (currentPosition + direction + enabled.length) % enabled.length;
  return enabled[nextPosition];
}

export function typeaheadIndex(
  options: DropdownOption[],
  currentIndex: number,
  key: string,
): number {
  const normalizedKey = key.toLocaleLowerCase();
  const enabled = enabledOptionIndexes(options);
  if (!normalizedKey || enabled.length === 0) {
    return currentIndex;
  }

  const startPosition = Math.max(enabled.indexOf(currentIndex), -1) + 1;
  const ordered = [...enabled.slice(startPosition), ...enabled.slice(0, startPosition)];
  const match = ordered.find((index) =>
    options[index].label.toLocaleLowerCase().startsWith(normalizedKey),
  );

  return match ?? currentIndex;
}
