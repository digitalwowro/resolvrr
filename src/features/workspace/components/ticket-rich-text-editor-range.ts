"use client";

const leafBlockSelector =
  "address,blockquote,h1,h2,h3,h4,h5,h6,li,p,pre";

function leafBlocks(editor: HTMLElement): HTMLElement[] {
  return Array.from(editor.querySelectorAll<HTMLElement>(leafBlockSelector))
    .filter((block) => !block.querySelector(leafBlockSelector));
}

function closestLeafBlock(
  editor: HTMLElement,
  node: Node,
): HTMLElement | null {
  const element = node instanceof Element ? node : node.parentElement;
  const block = element?.closest<HTMLElement>(leafBlockSelector) ?? null;
  return block && editor.contains(block) ? block : null;
}

function boundaryChildBlock(
  editor: HTMLElement,
  container: Node,
  offset: number,
): HTMLElement | null {
  const child = container.childNodes[offset];
  if (!child || !editor.contains(child)) return null;
  if (child instanceof HTMLElement && child.matches(leafBlockSelector)) {
    return child;
  }
  const element = child instanceof Element ? child : child.parentElement;
  return element?.querySelector<HTMLElement>(leafBlockSelector) ?? null;
}

function endpointBlock(
  editor: HTMLElement,
  container: Node,
  offset: number,
): HTMLElement | null {
  return boundaryChildBlock(editor, container, offset) ??
    closestLeafBlock(editor, container);
}

function rangeText(
  block: HTMLElement,
  endpointContainer: Node,
  endpointOffset: number,
  side: "before" | "after",
): string | null {
  if (!block.contains(endpointContainer) && block !== endpointContainer) {
    return null;
  }
  const probe = document.createRange();
  probe.selectNodeContents(block);
  try {
    if (side === "before") {
      probe.setEnd(endpointContainer, endpointOffset);
    } else {
      probe.setStart(endpointContainer, endpointOffset);
    }
  } catch {
    return null;
  }
  return probe.toString();
}

function setRangeStartAtBlockStart(range: Range, block: HTMLElement) {
  const blockRange = document.createRange();
  blockRange.selectNodeContents(block);
  range.setStart(blockRange.startContainer, blockRange.startOffset);
}

function setRangeEndAtBlockEnd(range: Range, block: HTMLElement) {
  const blockRange = document.createRange();
  blockRange.selectNodeContents(block);
  range.setEnd(blockRange.endContainer, blockRange.endOffset);
}

// Browser selections can visually stop at a paragraph while internally
// including the adjacent block boundary. Keep those separators outside the
// rewrite range so replacing selected text cannot merge neighboring blocks.
export function normalizeRewriteRange(
  editor: HTMLElement,
  source: Range,
): Range {
  const range = source.cloneRange();
  const blocks = leafBlocks(editor);

  const startBlock = endpointBlock(
    editor,
    range.startContainer,
    range.startOffset,
  );
  if (startBlock) {
    const startIndex = blocks.indexOf(startBlock);
    const boundaryAtBlockStart =
      boundaryChildBlock(
        editor,
        range.startContainer,
        range.startOffset,
      ) === startBlock;
    const contentAfterStart = rangeText(
      startBlock,
      range.startContainer,
      range.startOffset,
      "after",
    );
    const nextBlock = blocks[startIndex + 1];
    if (boundaryAtBlockStart && range.intersectsNode(startBlock)) {
      setRangeStartAtBlockStart(range, startBlock);
    } else if (
      contentAfterStart !== null &&
      !contentAfterStart.trim() &&
      nextBlock &&
      range.intersectsNode(nextBlock)
    ) {
      setRangeStartAtBlockStart(range, nextBlock);
    }
  }

  const endBlock = endpointBlock(
    editor,
    range.endContainer,
    range.endOffset,
  );
  if (endBlock) {
    const endIndex = blocks.indexOf(endBlock);
    const contentBeforeEnd = rangeText(
      endBlock,
      range.endContainer,
      range.endOffset,
      "before",
    );
    const previousBlock = blocks[endIndex - 1];
    const boundaryBeforeBlock =
      boundaryChildBlock(
        editor,
        range.endContainer,
        range.endOffset,
      ) === endBlock;
    if (
      (boundaryBeforeBlock ||
        (contentBeforeEnd !== null && !contentBeforeEnd.trim())) &&
      previousBlock &&
      range.intersectsNode(previousBlock)
    ) {
      setRangeEndAtBlockEnd(range, previousBlock);
    }
  }

  return range;
}
