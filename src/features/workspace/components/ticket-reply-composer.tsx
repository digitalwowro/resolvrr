"use client";

import {
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Send,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";

function EditorButton({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className="grid size-7 place-items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50"
      type="button"
    >
      {children}
    </button>
  );
}

export function TicketReplyComposer({
  className,
  onCancel,
}: {
  className: string;
  onCancel(): void;
}) {
  const [body, setBody] = useState("");

  return (
    <section
      aria-label="Reply composer"
      className={cn("shrink-0 border-t px-4 py-3", className)}
    >
      <div className="rounded-md border border-indigo-200 bg-white">
        <div
          aria-label="Reply body"
          className="min-h-24 px-3 py-2 outline-none empty:before:text-slate-400 empty:before:content-['Write_a_reply...']"
          contentEditable
          onInput={(event) => setBody(event.currentTarget.textContent ?? "")}
          role="textbox"
          suppressContentEditableWarning
        >
          {body}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-2 py-2">
          <div className="flex items-center gap-1">
            <EditorButton label="Bold">
              <Bold aria-hidden="true" className="size-3.5" />
            </EditorButton>
            <EditorButton label="Italic">
              <Italic aria-hidden="true" className="size-3.5" />
            </EditorButton>
            <EditorButton label="Insert link">
              <Link aria-hidden="true" className="size-3.5" />
            </EditorButton>
            <EditorButton label="Bulleted list">
              <List aria-hidden="true" className="size-3.5" />
            </EditorButton>
            <EditorButton label="Numbered list">
              <ListOrdered aria-hidden="true" className="size-3.5" />
            </EditorButton>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="!h-7 !px-2 !text-xs"
              onClick={onCancel}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              className="!h-7 !px-2 !text-xs"
              icon={<Send aria-hidden="true" className="size-3.5" />}
              onClick={() => undefined}
              type="button"
              variant="primary"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
