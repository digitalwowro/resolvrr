"use client";

import {
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import type {
  ActiveToolbarState,
  EditorCommand,
} from "./ticket-rich-text-editor-dom";
import { ToolbarButton } from "./ticket-rich-text-editor-toolbar";

const toolbarIconClassName = "size-3";

type TicketRichTextEditorToolbarRowProps = {
  activeToolbarState: ActiveToolbarState;
  disabled: boolean;
  onClose?(): void;
  onCommand(command: EditorCommand): void;
  onInsertLink(): void;
};

export function TicketRichTextEditorToolbarRow({
  activeToolbarState,
  disabled,
  onClose,
  onCommand,
  onInsertLink,
}: TicketRichTextEditorToolbarRowProps) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
      <ToolbarButton
        disabled={disabled}
        label="Undo"
        onClick={() => onCommand("undo")}
      >
        <Undo2 aria-hidden="true" className={toolbarIconClassName} />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        label="Redo"
        onClick={() => onCommand("redo")}
      >
        <Redo2 aria-hidden="true" className={toolbarIconClassName} />
      </ToolbarButton>
      <ToolbarButton
        active={activeToolbarState.bold}
        disabled={disabled}
        label="Bold"
        onClick={() => onCommand("bold")}
      >
        <Bold aria-hidden="true" className={toolbarIconClassName} />
      </ToolbarButton>
      <ToolbarButton
        active={activeToolbarState.italic}
        disabled={disabled}
        label="Italic"
        onClick={() => onCommand("italic")}
      >
        <Italic aria-hidden="true" className={toolbarIconClassName} />
      </ToolbarButton>
      <ToolbarButton
        active={activeToolbarState.underline}
        disabled={disabled}
        label="Underline"
        onClick={() => onCommand("underline")}
      >
        <Underline aria-hidden="true" className={toolbarIconClassName} />
      </ToolbarButton>
      <ToolbarButton
        active={activeToolbarState.unorderedList}
        disabled={disabled}
        label="Bulleted list"
        onClick={() => onCommand("insertUnorderedList")}
      >
        <List aria-hidden="true" className={toolbarIconClassName} />
      </ToolbarButton>
      <ToolbarButton
        active={activeToolbarState.orderedList}
        disabled={disabled}
        label="Numbered list"
        onClick={() => onCommand("insertOrderedList")}
      >
        <ListOrdered aria-hidden="true" className={toolbarIconClassName} />
      </ToolbarButton>
      <ToolbarButton
        active={activeToolbarState.link}
        disabled={disabled}
        label="Insert link"
        onClick={onInsertLink}
      >
        <Link aria-hidden="true" className={toolbarIconClassName} />
      </ToolbarButton>
      {onClose ? (
        <div className="ml-auto">
          <ToolbarButton
            className="border border-slate-300 bg-white"
            disabled={disabled}
            label="Close editor"
            onClick={onClose}
          >
            <X aria-hidden="true" className={toolbarIconClassName} />
          </ToolbarButton>
        </div>
      ) : null}
    </div>
  );
}
