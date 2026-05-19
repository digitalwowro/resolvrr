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
    <div className={cn("relative inline-block", className)} ref={rootRef}>
      {label ? (
        <span className="mb-1 block text-sm font-medium text-slate-800">
          {label}
        </span>
      ) : null}
      <button
        aria-label={ariaLabel ?? label}
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(dropdownTriggerClass, triggerClassName)}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
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
        <div className={dropdownMenuClass}>
          <label className="flex h-8 min-w-full items-center gap-2 rounded px-2 text-sm text-slate-600">
            <Search aria-hidden="true" className="size-4 shrink-0" />
            <input
              ref={inputRef}
              aria-activedescendant={
                highlightedIndex >= 0
                  ? `${id}-option-${visibleOptions[highlightedIndex]?.optionIndex}`
                  : undefined
              }
              aria-controls={`${id}-listbox`}
              aria-expanded={open}
              className="w-0 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
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
          </label>
          <div className="mt-1" id={`${id}-listbox`} role="listbox">
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
                      dropdownOptionStateClass.idle,
                      highlighted && dropdownOptionStateClass.highlighted,
                      selectedOption && dropdownOptionStateClass.selected,
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
              <p className="px-2 py-1 text-sm text-slate-500">{emptyMessage}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
