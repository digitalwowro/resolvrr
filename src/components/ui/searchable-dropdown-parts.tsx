import { Check, ChevronDown } from "lucide-react";
import { cn } from "./classnames";
import {
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

export type VisibleOption = DropdownOption & {
  optionIndex: number;
};

export function visibleOptionsFor(
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

export function SearchableDropdownMeasure({
  menuClassName,
  options,
  placeholder,
  selected,
  triggerClassName,
  value,
}: {
  menuClassName?: string;
  options: DropdownOption[];
  placeholder: string;
  selected?: DropdownOption;
  triggerClassName?: string;
  value?: string;
}) {
  return (
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
  );
}

export function SearchableDropdownOption({
  highlighted,
  id,
  index,
  onSelect,
  option,
  selected,
}: {
  highlighted: boolean;
  id: string;
  index: number;
  onSelect(index: number): void;
  option: VisibleOption;
  selected: boolean;
}) {
  return (
    <button
      aria-disabled={option.disabled || undefined}
      aria-selected={selected}
      className={cn(
        dropdownOptionClass,
        !selected && dropdownOptionStateClass.idle,
        selected && dropdownOptionStateClass.selected,
        highlighted && !selected && dropdownOptionStateClass.highlighted,
        option.disabled && dropdownOptionStateClass.disabled,
      )}
      disabled={option.disabled}
      id={`${id}-option-${option.optionIndex}`}
      onClick={() => onSelect(index)}
      role="option"
      type="button"
    >
      {option.icon}
      <span className="min-w-0 truncate">{option.label}</span>
      {selected ? <Check aria-hidden="true" className={dropdownIconClass} /> : null}
    </button>
  );
}
