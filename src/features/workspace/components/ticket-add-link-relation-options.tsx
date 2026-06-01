import { cn } from "@/components/ui/classnames";
import type { TicketLinkRelationKind } from "@/core/tickets";

type TicketAddLinkRelationOptionsProps = {
  canEditLinkRelations: boolean;
  relation: TicketLinkRelationKind;
  saving: boolean;
  onRelationChange(relation: TicketLinkRelationKind): void;
};

const relationOptions: Array<{
  description: string;
  label: string;
  value: TicketLinkRelationKind;
}> = [
  {
    description: "Persisted as the default related ticket link.",
    label: "Normal / Related",
    value: "related",
  },
  {
    description: "Selected ticket will be linked as this ticket's parent.",
    label: "Parent",
    value: "parent",
  },
  {
    description: "Selected ticket will be linked as this ticket's child.",
    label: "Child",
    value: "child",
  },
];

export function TicketAddLinkRelationOptions({
  canEditLinkRelations,
  relation,
  saving,
  onRelationChange,
}: TicketAddLinkRelationOptionsProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-slate-700">
        Relationship
      </legend>
      <div className="space-y-1">
        {relationOptions.map((option) => {
          const disabled = option.value !== "related" && !canEditLinkRelations;
          return (
            <label
              className={cn(
                "flex items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm",
                disabled ? "bg-slate-50 text-slate-400" : "bg-white",
              )}
              key={option.value}
            >
              <input
                checked={relation === option.value}
                className="mt-1"
                disabled={disabled || saving}
                name="ticket-link-relation"
                onChange={() => onRelationChange(option.value)}
                type="radio"
              />
              <span className="min-w-0">
                <span className="block font-medium">{option.label}</span>
                <span className="block text-xs text-slate-500">
                  {disabled ? "Unavailable for this workspace." : option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
