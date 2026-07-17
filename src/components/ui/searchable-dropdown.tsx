"use client";

import { ChevronDown, Search } from "lucide-react";
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
  dropdownIconClass,
  dropdownTriggerClass,
} from "./dropdown-styles";
import type { DropdownOption } from "./dropdown-types";
import {
  SearchableDropdownMeasure,
  SearchableDropdownOption,
  visibleOptionsFor,
  type VisibleOption,
} from "./searchable-dropdown-parts";
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
  menuClassName?: string;
  selectedDisplay?: DropdownOption;
};

function initialHighlightIndex(options: VisibleOption[]): number {
  return firstEnabledIndex(options);
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
  menuClassName,
  selectedDisplay,
}: SearchableDropdownProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selected = options.find((option) => option.value === value) ??
    (selectedDisplay?.value === value ? selectedDisplay : undefined);

  const visibleOptions = useMemo(
    () => visibleOptionsFor(options, query),
    [options, query],
  );

  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(rootRef, close, open);

  function openMenu() {
    setQuery("");
    setHighlightedIndex(-1);
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
        <span className="mb-1 block text-slate-800">
          {label}
        </span>
      ) : null}
      <div className="relative grid w-max max-w-sm">
        <SearchableDropdownMeasure
          menuClassName={menuClassName}
          options={options}
          placeholder={placeholder}
          selected={selected}
          triggerClassName={triggerClassName}
          value={value}
        />
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
          <ChevronDown aria-hidden="true" className={dropdownIconClass} />
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
              <Search
                aria-hidden="true"
                className={`${dropdownIconClass} text-slate-600`}
              />
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
                  setHighlightedIndex(initialHighlightIndex(nextOptions));
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={searchPlaceholder}
                role="combobox"
                type="text"
                value={query}
              />
              <ChevronDown aria-hidden="true" className={dropdownIconClass} />
            </label>
            <div
              className={cn(dropdownMenuClass, menuClassName, "left-0 top-full w-full")}
              id={`${id}-listbox`}
              role="listbox"
            >
              {visibleOptions.length > 0 ? (
                visibleOptions.map((option, index) => {
                  const highlighted = index === highlightedIndex;
                  const selectedOption = option.value === value;

                  return (
                    <SearchableDropdownOption
                      highlighted={highlighted}
                      id={id}
                      index={index}
                      key={option.value}
                      onSelect={selectVisibleOption}
                      option={option}
                      selected={selectedOption}
                    />
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
