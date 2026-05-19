import type { MenuDropdownItem } from "./menu-dropdown";

export function actionableIndexes(items: MenuDropdownItem[]): number[] {
  return items
    .map((item, index) =>
      (!item.type || item.type === "item") && !item.disabled ? index : -1,
    )
    .filter((index) => index >= 0);
}

export function nextActionableIndex(
  items: MenuDropdownItem[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  const indexes = actionableIndexes(items);
  if (indexes.length === 0) {
    return -1;
  }

  const position = indexes.indexOf(currentIndex);
  if (position === -1) {
    return direction === 1 ? indexes[0] : indexes[indexes.length - 1];
  }

  return indexes[(position + direction + indexes.length) % indexes.length];
}

export function typeaheadActionableIndex(
  items: MenuDropdownItem[],
  currentIndex: number,
  key: string,
  repeated: boolean,
): number {
  const normalizedKey = key.toLocaleLowerCase();
  const indexes = actionableIndexes(items);
  if (!normalizedKey || indexes.length === 0) {
    return currentIndex;
  }

  const currentPosition = indexes.indexOf(currentIndex);
  const startPosition = repeated && currentPosition >= 0 ? currentPosition + 1 : 0;
  const ordered = [...indexes.slice(startPosition), ...indexes.slice(0, startPosition)];
  const match = ordered.find((index) => {
    const item = items[index];
    return (
      (!item.type || item.type === "item") &&
      item.label.toLocaleLowerCase().startsWith(normalizedKey)
    );
  });

  return match ?? currentIndex;
}
