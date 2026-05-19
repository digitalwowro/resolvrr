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
  firstEnabledIndex,
  nextEnabledIndex,
  selectedOptionIndex,
  typeaheadIndex,
} from "./dropdown-navigation";
import {
  dropdownMenuClass,
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
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
};

export function DropdownSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select",
  disabled = false,
  label,
  ariaLabel,
  className,
  triggerClassName,
}: DropdownSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef({ key: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectedIndex = selectedOptionIndex(options, value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(rootRef, close, open);

  function openMenu() {
    const nextIndex = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options);
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
      openMenu();
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
        <span className="mb-1 block font-medium text-slate-800">
          {label}
        </span>
      ) : null}
      <div className="relative grid w-max min-w-full max-w-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none invisible col-start-1 row-start-1 grid"
        >
          <div
            className={cn(
              dropdownTriggerClass,
              triggerClassName,
              "col-start-1 row-start-1",
            )}
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              {selected?.icon}
              <span className={selected ? "truncate" : "truncate text-slate-500"}>
                {selected?.label ?? placeholder}
              </span>
            </span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
          </div>
          {options.map((option) => (
            <div
              className="col-start-1 row-start-1 flex h-0 min-w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-sm outline-none"
              key={option.value}
            >
              {option.icon}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <Check aria-hidden="true" className="size-4 shrink-0" />
            </div>
          ))}
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
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        </button>
        {open ? (
          <div
            className={cn(dropdownMenuClass, "left-0 top-full w-full")}
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
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {selectedOption ? (
                    <Check aria-hidden="true" className="size-4 shrink-0" />
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
