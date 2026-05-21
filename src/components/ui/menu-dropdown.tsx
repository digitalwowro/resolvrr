"use client";

import { Check, ChevronDown } from "lucide-react";
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
  dropdownIconClass,
  dropdownMeasureMenuClass,
  dropdownMeasureMenuFrameClass,
  dropdownMeasureOptionClass,
  dropdownMeasureRootClass,
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
      selected?: boolean;
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
  menuClassName?: string;
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
  menuClassName,
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

  function openMenu(nextIndex = -1) {
    setHighlightedIndex(nextIndex);
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

  const triggerButton = (
    <button
      ref={triggerRef}
      aria-controls={`${id}-menu`}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-label={triggerLabel}
      className={cn(
        !unstyledTrigger && dropdownTriggerClass,
        triggerClassName,
        !unstyledTrigger && "col-start-1 row-start-1 w-full",
      )}
      onClick={() => (open ? close() : openMenu())}
      onKeyDown={(event) => {
        if (["Enter", " ", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          openMenu(
            event.key === "ArrowDown" ? nextActionableIndex(items, -1, 1) : -1,
          );
        }
      }}
      type="button"
    >
      {triggerContent ?? <span className="truncate">{triggerLabel}</span>}
      {showChevron ? (
        <ChevronDown aria-hidden="true" className={dropdownIconClass} />
      ) : null}
    </button>
  );

  const menuPanel = open ? (
    <div
      ref={menuRef}
      aria-activedescendant={
        highlightedIndex >= 0 ? `${id}-item-${highlightedIndex}` : undefined
      }
      className={cn(
        dropdownMenuClass,
        menuClassName,
        "top-full",
        !unstyledTrigger ? "w-full" : "w-max min-w-full",
        align === "end" ? "right-0" : "left-0",
      )}
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
              className="px-2 py-1 uppercase text-slate-500"
              key={item.id}
            >
              {item.label}
            </div>
          );
        }

        const highlighted = index === highlightedIndex;
        const selected = item.selected;
        return (
          <button
            aria-disabled={item.disabled || undefined}
            className={cn(
              dropdownOptionClass,
              !selected && dropdownOptionStateClass.idle,
              selected && dropdownOptionStateClass.selected,
              highlighted && !selected && dropdownOptionStateClass.highlighted,
              item.disabled && dropdownOptionStateClass.disabled,
              item.destructive && !item.disabled && "!text-rose-700 hover:!text-rose-700",
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
            <span className="min-w-0 truncate">{item.label}</span>
            {selected ? <Check aria-hidden="true" className={dropdownIconClass} /> : null}
          </button>
        );
      })}
    </div>
  ) : null;

  if (unstyledTrigger) {
    return (
      <div className={cn("relative inline-block", className)} ref={rootRef}>
        {triggerButton}
        {menuPanel}
      </div>
    );
  }

  return (
    <div className={cn("inline-block", className)} ref={rootRef}>
      <div className="relative grid w-max max-w-sm">
        <div
          aria-hidden="true"
          className={cn(dropdownMeasureRootClass, menuClassName)}
        >
          <div
            className={cn(
              dropdownTriggerClass,
              triggerClassName,
              "col-start-1 row-start-1",
            )}
          >
            {triggerContent ?? <span className="truncate">{triggerLabel}</span>}
            {showChevron ? (
              <ChevronDown aria-hidden="true" className={dropdownIconClass} />
            ) : null}
          </div>
          <div className={dropdownMeasureMenuFrameClass}>
            <div className={dropdownMeasureMenuClass}>
              {items.map((item) => {
                if (item.type === "separator") {
                  return null;
                }

                if (item.type === "heading") {
                  return (
                    <div
                      className="h-8 w-max overflow-hidden px-2 py-0 uppercase whitespace-nowrap text-slate-500"
                      key={item.id}
                    >
                      {item.label}
                    </div>
                  );
                }

                return (
                  <div className={dropdownMeasureOptionClass} key={item.id}>
                    {item.icon}
                    <span>{item.label}</span>
                    {item.selected ? (
                      <Check aria-hidden="true" className={dropdownIconClass} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {triggerButton}
        {menuPanel}
      </div>
    </div>
  );
}
