import type { TicketMetadataMutationActionState } from "@/features/tickets/mutation-model";
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
  mutationResult: TicketMetadataMutationActionState;
  onDraftChange(draft: SelectedTicketDraft): void;
  recentlyViewedLinkTargets: WorkspaceTicketLinkTarget[];
  saving: boolean;
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  statusText?: string;
  validationMessage?: string;
};

export function TicketMetadataEditorSidebar(props: Props) {
  const statusIsWarning = props.mutationResult.status === "failed" ||
    props.mutationResult.status === "saved-refresh-failed" ||
    props.mutationResult.status === "partially-saved";
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
      {props.statusText ? (
        <p className={statusIsWarning ? "text-xs text-amber-700" : "text-xs text-slate-600"} role="alert">
          {props.statusText}
        </p>
      ) : null}
    </TicketDetailSidebar>
  );
}
