import type { TicketMetadataMutationCapabilities } from "@/features/tickets/mutation-model";
import type {
  SearchWorkspaceTicketLinkTargetsAction,
  WorkspaceTicketLinkTarget,
} from "@/features/tickets/link-target-search-action-result";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import type {
  SelectedTicketDraft,
  TicketMetadataDraftDirtyFields,
} from "./metadata-draft";
import { TicketSecondaryLinksField } from "./ticket-secondary-links-field";
import { TicketSecondarySubscriptionField } from "./ticket-secondary-subscription-field";
import { TicketSecondaryTagsField } from "./ticket-secondary-tags-field";

export function TicketSecondaryMetadataFields({
  detail,
  dirtyFields,
  draft,
  metadataMutationCapabilities,
  onDraftChange,
  recentlyViewedLinkTargets,
  searchTicketLinkTargetsAction,
  saving,
}: {
  detail: WorkspaceTicketDetail;
  dirtyFields: TicketMetadataDraftDirtyFields;
  draft: SelectedTicketDraft;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  onDraftChange(nextDraft: SelectedTicketDraft): void;
  recentlyViewedLinkTargets: WorkspaceTicketLinkTarget[];
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  saving: boolean;
}) {
  const canEditLinks = metadataMutationCapabilities.links === true;
  const canEditLinkRelations =
    metadataMutationCapabilities.linkRelations === true;
  const canEditSubscription =
    metadataMutationCapabilities.subscription === true &&
    detail.subscription.supported;
  const canEditTags = metadataMutationCapabilities.tags === true;

  return (
    <>
      <TicketSecondarySubscriptionField
        canEditSubscription={canEditSubscription}
        detail={detail}
        draft={draft}
        onDraftChange={onDraftChange}
        saving={saving}
      />
      <TicketSecondaryTagsField
        canEditTags={canEditTags}
        dirtyFields={dirtyFields}
        draft={draft}
        tagLookup={detail.lookupData.tags}
        onDraftChange={onDraftChange}
        saving={saving}
      />
      <TicketSecondaryLinksField
        canEditLinks={canEditLinks}
        canEditLinkRelations={canEditLinkRelations}
        detail={detail}
        dirtyFields={dirtyFields}
        draft={draft}
        onDraftChange={onDraftChange}
        recentlyViewedLinkTargets={recentlyViewedLinkTargets}
        searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
        saving={saving}
      />
    </>
  );
}
