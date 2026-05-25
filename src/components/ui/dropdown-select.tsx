"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { cn } from "./classnames";
import {
  nextEnabledIndex,
  selectedOptionIndex,
  typeaheadIndex,
} from "./dropdown-navigation";
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
import type { DropdownOption } from "./dropdown-types";
import { useOutsideClick } from "./use-outside-click";

type DropdownSelectProps = {
  options: DropdownOption[];
  value?: string;
  onValueChange(value: string): void;
  selectedDisplay?: Pick<DropdownOption, "icon" | "label">;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  menuPlacement?: "bottom" | "top";
};

export function DropdownSelect({
  options,
  value,
  onValueChange,
  selectedDisplay,
  placeholder = "Select",
  disabled = false,
  label,
  ariaLabel,
  className,
  triggerClassName,
  menuClassName,
  menuPlacement = "bottom",
}: DropdownSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef({ key: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectedIndex = selectedOptionIndex(options, value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : selectedDisplay;

  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(rootRef, close, open);

  function openMenu(nextIndex = -1) {
    setHighlightedIndex(nextIndex);
    setOpen(true);
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option || option.disabled) {
      return;
    }

    onValueChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (!open && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      openMenu(
        event.key === "ArrowDown"
          ? nextEnabledIndex(options, -1, 1)
          : event.key === "ArrowUp"
            ? nextEnabledIndex(options, -1, -1)
            : -1,
      );
      return;
    }

    if (!open) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        nextEnabledIndex(options, current, event.key === "ArrowDown" ? 1 : -1),
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectOption(highlightedIndex);
      return;
    }

    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
      const key = event.key.toLocaleLowerCase();
      const now = event.timeStamp;
      const repeated =
        typeaheadRef.current.key === key && now - typeaheadRef.current.time < 750;
      typeaheadRef.current = { key, time: now };
      setHighlightedIndex((current) =>
        typeaheadIndex(options, repeated ? current : -1, event.key),
      );
    }
  }

  return (
    <div className={cn("inline-block", className)} ref={rootRef}>
      {label ? (
        <span className="mb-1 block text-slate-800">
          {label}
        </span>
      ) : null}
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
            <span className="flex items-center gap-2 whitespace-nowrap">
              {selected?.icon}
              <span className={selected ? undefined : "text-slate-500"}>
                {selected?.label ?? placeholder}
              </span>
            </span>
            <ChevronDown aria-hidden="true" className={dropdownIconClass} />
          </div>
          <div className={dropdownMeasureMenuFrameClass}>
            <div className={dropdownMeasureMenuClass}>
              {options.map((option) => (
                <div className={dropdownMeasureOptionClass} key={option.value}>
                  {option.icon}
                  <span>{option.label}</span>
                  {option.value === value ? (
                    <Check aria-hidden="true" className={dropdownIconClass} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
        <button
          aria-activedescendant={
            open && highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined
          }
          aria-label={ariaLabel ?? label}
          aria-controls={`${id}-listbox`}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            dropdownTriggerClass,
            triggerClassName,
            "col-start-1 row-start-1 w-full",
          )}
          disabled={disabled}
          onClick={() => (open ? close() : openMenu())}
          onKeyDown={handleKeyDown}
          role="combobox"
          type="button"
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {selected?.icon}
            <span className={selected ? "truncate" : "truncate text-slate-500"}>
              {selected?.label ?? placeholder}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className={dropdownIconClass} />
        </button>
        {open ? (
          <div
            className={cn(
              dropdownMenuClass,
              menuClassName,
              "left-0 top-full w-full",
              menuPlacement === "top" && "!top-auto bottom-full -translate-y-1",
            )}
            id={`${id}-listbox`}
            role="listbox"
          >
            {options.map((option, index) => {
              const highlighted = index === highlightedIndex;
              const selectedOption = option.value === value;

              return (
                <button
                  aria-disabled={option.disabled || undefined}
                  aria-selected={selectedOption}
                  className={cn(
                    dropdownOptionClass,
                    !selectedOption && dropdownOptionStateClass.idle,
                    selectedOption && dropdownOptionStateClass.selected,
                    highlighted &&
                      !selectedOption &&
                      dropdownOptionStateClass.highlighted,
                    option.disabled && dropdownOptionStateClass.disabled,
                  )}
                  disabled={option.disabled}
                  id={`${id}-option-${index}`}
                  key={option.value}
                  onClick={() => selectOption(index)}
                  role="option"
                  type="button"
                >
                  {option.icon}
                  <span className="min-w-0 truncate">{option.label}</span>
                  {selectedOption ? (
                    <Check aria-hidden="true" className={dropdownIconClass} />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type { DropdownOption };
