import type { TicketMetadataMutationCapabilities } from "@/features/tickets/mutation-model";
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
  saving,
}: {
  detail: WorkspaceTicketDetail;
  dirtyFields: TicketMetadataDraftDirtyFields;
  draft: SelectedTicketDraft;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  onDraftChange(nextDraft: SelectedTicketDraft): void;
  saving: boolean;
}) {
  const canEditLinks = metadataMutationCapabilities.links === true;
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
        onDraftChange={onDraftChange}
        saving={saving}
      />
      <TicketSecondaryLinksField
        canEditLinks={canEditLinks}
        detail={detail}
        dirtyFields={dirtyFields}
        draft={draft}
        onDraftChange={onDraftChange}
        saving={saving}
      />
    </>
  );
}
