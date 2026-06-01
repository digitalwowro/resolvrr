import { DropdownSelect, type DropdownOption } from "@/components/ui";
import type { TicketLinkRelationKind } from "@/core/tickets";

type TicketAddLinkRelationOptionsProps = {
  canEditLinkRelations: boolean;
  relation: TicketLinkRelationKind;
  saving: boolean;
  onRelationChange(relation: TicketLinkRelationKind): void;
};

const relationOptions: Array<DropdownOption & { value: TicketLinkRelationKind }> = [
  {
    label: "Normal / Related",
    value: "related",
  },
  {
    label: "Parent",
    value: "parent",
  },
  {
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
  const options = relationOptions.map((option) => ({
    ...option,
    disabled: option.value !== "related" && !canEditLinkRelations,
  }));

  return (
    <DropdownSelect
      ariaLabel="Relationship"
      className="block"
      disabled={saving}
      menuPlacement="top"
      onValueChange={(value) => onRelationChange(value as TicketLinkRelationKind)}
      options={options}
      triggerClassName="!h-9 min-w-40 text-sm font-normal"
      value={relation}
    />
  );
}
