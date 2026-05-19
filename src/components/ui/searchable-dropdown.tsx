"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { cn } from "./classnames";
import { firstEnabledIndex, nextEnabledIndex } from "./dropdown-navigation";
import {
  dropdownMenuClass,
  dropdownOptionClass,
  dropdownOptionStateClass,
  dropdownTriggerClass,
} from "./dropdown-styles";
import type { DropdownOption } from "./dropdown-types";
import { useOutsideClick } from "./use-outside-click";

type SearchableDropdownProps = {
  options: DropdownOption[];
  value?: string;
  onValueChange(value: string): void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  label?: string;
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
};

type VisibleOption = DropdownOption & {
  optionIndex: number;
};

function visibleOptionsFor(
  options: DropdownOption[],
  query: string,
): VisibleOption[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return options
    .map((option, optionIndex) => ({ ...option, optionIndex }))
    .filter((option) =>
      normalizedQuery
        ? option.label.toLocaleLowerCase().includes(normalizedQuery)
        : true,
    );
}

function initialHighlightIndex(
  options: VisibleOption[],
  value: string | undefined,
): number {
  const selectedIndex = options.findIndex(
    (option) => option.value === value && !option.disabled,
  );
  return selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options);
}

export function SearchableDropdown({
  options,
  value,
  onValueChange,
  placeholder = "Select",
  searchPlaceholder = "Search",
  emptyMessage = "No options",
  disabled = false,
  label,
  ariaLabel,
  className,
  triggerClassName,
}: SearchableDropdownProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selected = options.find((option) => option.value === value);

  const visibleOptions = useMemo(
    () => visibleOptionsFor(options, query),
    [options, query],
  );

  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(rootRef, close, open);

  function openMenu() {
    setQuery("");
    setHighlightedIndex(initialHighlightIndex(visibleOptionsFor(options, ""), value));
    setOpen(true);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    inputRef.current?.focus();
  }, [open]);

  function selectVisibleOption(index: number) {
    const option = visibleOptions[index];
    if (!option || option.disabled) {
      return;
    }

    onValueChange(option.value);
    setOpen(false);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        nextEnabledIndex(
          visibleOptions,
          current,
          event.key === "ArrowDown" ? 1 : -1,
        ),
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const enabled = visibleOptions.filter((option) => !option.disabled);
      if (highlightedIndex >= 0) {
        selectVisibleOption(highlightedIndex);
      } else if (enabled.length === 1) {
        onValueChange(enabled[0].value);
        setOpen(false);
      }
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
          aria-hidden={open || undefined}
          aria-label={ariaLabel ?? label}
          aria-controls={`${id}-listbox`}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            dropdownTriggerClass,
            triggerClassName,
            "col-start-1 row-start-1 w-full",
            open && "pointer-events-none opacity-0",
          )}
          disabled={disabled}
          onClick={() => (open ? close() : openMenu())}
          role="combobox"
          tabIndex={open ? -1 : undefined}
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
          <>
            <label
              className={cn(
                dropdownTriggerClass,
                triggerClassName,
                "absolute left-0 top-0 z-50 w-full",
              )}
            >
              <Search aria-hidden="true" className="size-4 shrink-0 text-slate-600" />
              <input
                ref={inputRef}
                aria-activedescendant={
                  highlightedIndex >= 0
                    ? `${id}-option-${visibleOptions[highlightedIndex]?.optionIndex}`
                    : undefined
                }
                aria-controls={`${id}-listbox`}
                aria-expanded={open}
                aria-label={ariaLabel ?? label}
                className="w-0 min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                onChange={(event) => {
                  const nextQuery = event.currentTarget.value;
                  const nextOptions = visibleOptionsFor(options, nextQuery);
                  setQuery(nextQuery);
                  setHighlightedIndex(initialHighlightIndex(nextOptions, value));
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={searchPlaceholder}
                role="combobox"
                type="text"
                value={query}
              />
              <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
            </label>
            <div
              className={cn(dropdownMenuClass, "left-0 top-full w-full")}
              id={`${id}-listbox`}
              role="listbox"
            >
              {visibleOptions.length > 0 ? (
                visibleOptions.map((option, index) => {
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
                      id={`${id}-option-${option.optionIndex}`}
                      key={option.value}
                      onClick={() => selectVisibleOption(index)}
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
                })
              ) : (
                <p className="px-2 py-1 text-slate-500">{emptyMessage}</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
