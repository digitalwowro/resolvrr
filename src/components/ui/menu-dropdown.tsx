"use client";

import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "./classnames";
import {
  dropdownMenuClass,
  dropdownOptionClass,
  dropdownOptionStateClass,
  dropdownTriggerClass,
} from "./dropdown-styles";
import {
  nextActionableIndex,
  typeaheadActionableIndex,
} from "./menu-navigation";
import { useOutsideClick } from "./use-outside-click";

export type MenuDropdownItem =
  | {
      type?: "item";
      id: string;
      label: string;
      icon?: ReactNode;
      disabled?: boolean;
      destructive?: boolean;
      onSelect(): void;
    }
  | {
      type: "heading";
      id: string;
      label: string;
    }
  | {
      type: "separator";
      id: string;
    };

type MenuDropdownProps = {
  triggerLabel: string;
  triggerContent?: ReactNode;
  items: MenuDropdownItem[];
  align?: "start" | "end";
  className?: string;
  triggerClassName?: string;
  showChevron?: boolean;
  unstyledTrigger?: boolean;
};

export function MenuDropdown({
  triggerLabel,
  triggerContent,
  items,
  align = "start",
  className,
  triggerClassName,
  showChevron = true,
  unstyledTrigger = false,
}: MenuDropdownProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef({ key: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const close = useCallback(() => setOpen(false), []);

  useOutsideClick(rootRef, close, open);

  function openMenu() {
    setHighlightedIndex(nextActionableIndex(items, -1, 1));
    setOpen(true);
  }

  function closeAndRestoreFocus() {
    close();
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (open) {
      menuRef.current?.focus();
    }
  }, [open]);

  function activate(index: number) {
    const item = items[index];
    if (!item || (item.type && item.type !== "item") || item.disabled) {
      return;
    }

    item.onSelect();
    closeAndRestoreFocus();
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndRestoreFocus();
      return;
    }

    if (event.key === "Tab") {
      close();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        nextActionableIndex(items, current, event.key === "ArrowDown" ? 1 : -1),
      );
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setHighlightedIndex(nextActionableIndex(items, -1, event.key === "Home" ? 1 : -1));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(highlightedIndex);
      return;
    }

    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
      const key = event.key.toLocaleLowerCase();
      const now = event.timeStamp;
      const repeated =
        typeaheadRef.current.key === key && now - typeaheadRef.current.time < 750;
      typeaheadRef.current = { key, time: now };
      setHighlightedIndex((current) =>
        typeaheadActionableIndex(items, current, event.key, repeated),
      );
    }
  }

  return (
    <div className={cn("relative inline-block", className)} ref={rootRef}>
      <button
        ref={triggerRef}
        aria-controls={`${id}-menu`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={triggerLabel}
        className={cn(!unstyledTrigger && dropdownTriggerClass, triggerClassName)}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (["Enter", " ", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            openMenu();
          }
        }}
        type="button"
      >
        {triggerContent ?? <span className="truncate">{triggerLabel}</span>}
        {showChevron ? (
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        ) : null}
      </button>
      {open ? (
        <div
          ref={menuRef}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${id}-item-${highlightedIndex}` : undefined
          }
          className={cn(dropdownMenuClass, align === "end" && "right-0")}
          id={`${id}-menu`}
          onKeyDown={handleMenuKeyDown}
          role="menu"
          tabIndex={-1}
        >
          {items.map((item, index) => {
            if (item.type === "separator") {
              return <div className="my-1 h-px bg-slate-200" key={item.id} />;
            }

            if (item.type === "heading") {
              return (
                <div
                  className="px-2 py-1 text-xs font-medium uppercase text-slate-500"
                  key={item.id}
                >
                  {item.label}
                </div>
              );
            }

            const highlighted = index === highlightedIndex;
            return (
              <button
                aria-disabled={item.disabled || undefined}
                className={cn(
                  dropdownOptionClass,
                  dropdownOptionStateClass.idle,
                  highlighted && dropdownOptionStateClass.highlighted,
                  item.disabled && dropdownOptionStateClass.disabled,
                  item.destructive && !item.disabled && "text-rose-700",
                )}
                disabled={item.disabled}
                id={`${id}-item-${index}`}
                key={item.id}
                onClick={() => activate(index)}
                role="menuitem"
                tabIndex={-1}
                type="button"
              >
                {item.icon}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
