import type { TicketLinkRelationKind } from "@/core/tickets";
import type {
  SearchWorkspaceTicketLinkTargetsAction,
  WorkspaceTicketLinkTarget,
} from "@/features/tickets/link-target-search-action-result";

export type TicketAddLinkDialogProps = {
  canEditLinkRelations: boolean;
  currentTicketCustomerExternalId?: string;
  currentTicketExternalId: string;
  initialRelation: TicketLinkRelationKind;
  initialTicketId?: string;
  recentlyViewedTargets: WorkspaceTicketLinkTarget[];
  saving: boolean;
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  onAdd(input: {
    relation: TicketLinkRelationKind;
    ticketId: string;
    target?: WorkspaceTicketLinkTarget;
  }): void;
  onClose(): void;
};
