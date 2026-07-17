"use client";

import { BotMessageSquare, Repeat2, SpellCheck2 } from "lucide-react";
import {
  ToolbarButton,
  ToolbarMenuDropdown,
  type MenuDropdownItem,
} from "@/components/ui";
import type { AiRephraseStyleOption } from "@/features/ai";

const aiIconClassName = "size-4";
const aiButtonClassName = "!text-sm !font-medium";
const rephraseTriggerClassName =
  `${aiButtonClassName} !justify-start !border-transparent !bg-transparent !text-slate-700 hover:!bg-slate-100`;

export function TicketAiEditorToolbar({
  disabled,
  onProofread,
  onRephrase,
  pending,
  selectionActive,
  styles,
}: {
  disabled: boolean;
  onProofread(): void;
  onRephrase(styleId: string): void;
  pending: boolean;
  selectionActive: boolean;
  styles: AiRephraseStyleOption[];
}) {
  const proofreadLabel = selectionActive ? "Proofread selection" : "Proofread";
  const rephraseLabel = selectionActive ? "Rephrase selection" : "Rephrase";
  const rephraseItems: MenuDropdownItem[] = styles.map((style) => ({
    id: style.id,
    label: style.label,
    onSelect: () => onRephrase(style.id),
  }));

  return (
    <>
      <ToolbarButton
        className={aiButtonClassName}
        disabled={disabled || pending}
        icon={<SpellCheck2 aria-hidden="true" className={aiIconClassName} />}
        onClick={onProofread}
        type="button"
        variant="ghost"
      >
        {proofreadLabel}
      </ToolbarButton>
      <ToolbarMenuDropdown
        align="end"
        disabled={disabled || pending || styles.length === 0}
        items={rephraseItems}
        showChevron={false}
        triggerClassName={rephraseTriggerClassName}
        triggerContent={(
          <>
            <Repeat2 aria-hidden="true" className={aiIconClassName} />
            <span>{rephraseLabel}</span>
          </>
        )}
        triggerLabel={rephraseLabel}
      />
      <ToolbarButton
        aria-disabled="true"
        className={aiButtonClassName}
        disabled={disabled}
        icon={<BotMessageSquare aria-hidden="true" className={aiIconClassName} />}
        title="Coming soon"
        type="button"
        variant="ghost"
      >
        AI Reply
      </ToolbarButton>
    </>
  );
}
