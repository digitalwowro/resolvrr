import type {
  SearchWorkspaceTicketLinkTargetsAction,
  WorkspaceTicketLinkTarget,
} from "@/features/tickets/link-target-search-action-result";
import type {
  TicketMetadataDraftDirtyFields,
  SelectedTicketDraft,
} from "./metadata-draft";
import type { TicketMetadataEditorStateProps } from "./ticket-metadata-editor-state-types";
import { TicketAssignmentFields } from "./ticket-assignment-fields";
import { TicketDetailSidebar } from "./ticket-detail-sidebar";
import { TicketPrimaryMetadataFields } from "./ticket-primary-metadata-fields";
import { TicketSecondaryMetadataFields } from "./ticket-secondary-metadata-fields";

type Props = Pick<
  TicketMetadataEditorStateProps,
  "detail" | "metadataMutationCapabilities"
> & {
  dirtyFields: TicketMetadataDraftDirtyFields;
  draft: SelectedTicketDraft;
  hasChanges: boolean;
  onDraftChange(draft: SelectedTicketDraft): void;
  recentlyViewedLinkTargets: WorkspaceTicketLinkTarget[];
  saving: boolean;
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  validationMessage?: string;
};

export function TicketMetadataEditorSidebar(props: Props) {
  return (
    <TicketDetailSidebar>
      <TicketPrimaryMetadataFields
        detail={props.detail}
        dirtyFields={props.dirtyFields}
        draft={props.draft}
        metadataMutationCapabilities={props.metadataMutationCapabilities}
        onDraftChange={props.onDraftChange}
        saving={props.saving}
      />
      <TicketAssignmentFields
        detail={props.detail}
        dirtyFields={props.dirtyFields}
        draft={props.draft}
        metadataMutationCapabilities={props.metadataMutationCapabilities}
        onDraftChange={props.onDraftChange}
        saving={props.saving}
      />
      <TicketSecondaryMetadataFields
        detail={props.detail}
        dirtyFields={props.dirtyFields}
        draft={props.draft}
        metadataMutationCapabilities={props.metadataMutationCapabilities}
        onDraftChange={props.onDraftChange}
        recentlyViewedLinkTargets={props.recentlyViewedLinkTargets}
        searchTicketLinkTargetsAction={props.searchTicketLinkTargetsAction}
        saving={props.saving}
      />
      {props.hasChanges && props.validationMessage ? (
        <p className="text-xs text-amber-700" role="alert">
          {props.validationMessage}
        </p>
      ) : null}
    </TicketDetailSidebar>
  );
}
