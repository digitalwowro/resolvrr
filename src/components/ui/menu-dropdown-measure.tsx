import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./classnames";
import {
  dropdownIconClass,
  dropdownMeasureMenuClass,
  dropdownMeasureMenuFrameClass,
  dropdownMeasureOptionClass,
  dropdownMeasureRootClass,
  dropdownTriggerClass,
} from "./dropdown-styles";
import type { MenuDropdownItem } from "./menu-dropdown";

export function MenuDropdownMeasure({
  items,
  menuClassName,
  showChevron,
  triggerClassName,
  triggerContent,
  triggerLabel,
}: {
  items: MenuDropdownItem[];
  menuClassName?: string;
  showChevron: boolean;
  triggerClassName?: string;
  triggerContent?: ReactNode;
  triggerLabel: string;
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
  );
}
