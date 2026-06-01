import { describe, expect, it } from "vitest";
import {
  metadataDraftDirtyFields,
  metadataDraftFromBaseline,
  metadataDraftFromDetail,
  metadataDraftUpdatePayload,
  selectedTicketDraftEditableSlices,
} from "@/features/workspace/components/metadata-draft";
import { selectedDetailProps } from "./ticket-workspace-test-utils";

describe("selected ticket draft model", () => {
  it("keeps future editable areas behind explicit draft slices", () => {
    expect(selectedTicketDraftEditableSlices).toEqual([
      "metadata",
      "communication",
    ]);
  });

  it("stores editable ticket metadata inside a selected-ticket draft", () => {
    const { detail } = selectedDetailProps();

    const draft = metadataDraftFromDetail(detail);

    expect(draft).toEqual({
      communication: {
        commentBody: "",
        replyBody: "",
      },
      metadata: {
        groupExternalId: "group-1",
        linkAddExternalId: "",
        linkAddRelation: "related",
        linkRemoveExternalIds: [],
        ownerExternalId: "agent-1",
        pendingDateTime: {
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          time: "08:00",
        },
        priority: "medium",
        state: "open",
        subscriptionFollowing: undefined,
        tagText: "",
        tags: [],
      },
      ticketExternalId: "ticket-1",
    });
  });

  it("tracks dirty fields per editable metadata field", () => {
    const baseline = metadataDraftFromDetail(selectedDetailProps().detail);
    const draft = metadataDraftFromBaseline(baseline);
    draft.metadata.state = "pending_reminder";
    draft.metadata.priority = "high";
    draft.metadata.ownerExternalId = "agent-2";
    draft.metadata.groupExternalId = "group-2";
    draft.metadata.tagText = "vip, renewal";
    draft.metadata.tags = ["vip", "renewal"];
    draft.metadata.linkAddExternalId = "ticket-2";
    draft.metadata.linkAddRelation = "parent";
    draft.metadata.subscriptionFollowing = true;
    draft.metadata.pendingDateTime = { date: "2099-01-02", time: "09:30" };

    expect(metadataDraftDirtyFields(baseline, draft)).toEqual({
      communication: false,
      group: true,
      links: true,
      owner: true,
      pendingDate: true,
      pendingTime: true,
      pendingUntil: true,
      priority: true,
      state: true,
      subscription: true,
      tags: true,
    });
  });

  it("resets the whole selected-ticket draft from the loaded baseline", () => {
    const baseline = metadataDraftFromDetail(selectedDetailProps().detail);
    const draft = metadataDraftFromBaseline(baseline);
    draft.metadata.priority = "high";
    draft.metadata.pendingDateTime.date = "2099-01-02";

    const resetDraft = metadataDraftFromBaseline(baseline);

    expect(resetDraft).toEqual(baseline);
    expect(resetDraft).not.toBe(baseline);
    expect(resetDraft.metadata.pendingDateTime).not.toBe(
      baseline.metadata.pendingDateTime,
    );
  });

  it("creates one provider-neutral selected-ticket update payload from the draft", () => {
    const baseline = metadataDraftFromDetail(selectedDetailProps().detail);
    const draft = metadataDraftFromBaseline(baseline);
    draft.metadata.state = "pending_reminder";
    draft.metadata.priority = "high";
    draft.metadata.ownerExternalId = "agent-2";
    draft.metadata.groupExternalId = "group-2";
    draft.metadata.tagText = "vip, renewal";
    draft.metadata.tags = ["vip", "renewal"];
    draft.metadata.linkAddExternalId = "ticket-2";
    draft.metadata.linkAddRelation = "parent";
    draft.metadata.subscriptionFollowing = true;
    draft.metadata.pendingDateTime = { date: "2099-01-02", time: "09:30" };

    const payload = metadataDraftUpdatePayload(baseline, draft);

    expect(payload).toEqual({
      metadata: {
        groupExternalId: "group-2",
        linkAddExternalId: "ticket-2",
        linkAddRelation: "parent",
        ownerExternalId: "agent-2",
        pendingUntil: new Date("2099-01-02T09:30").toISOString(),
        priority: "high",
        state: "pending_reminder",
        subscriptionFollowing: true,
        tags: ["vip", "renewal"],
      },
      ticketExternalId: "ticket-1",
    });
  });

  it("adds staged reply and comment text to the selected-ticket update payload", () => {
    const baseline = metadataDraftFromDetail(selectedDetailProps().detail);
    const draft = metadataDraftFromBaseline(baseline);
    draft.communication.commentBody = "  Checked the logs.  ";
    draft.communication.replyBody = "  Thanks for the report.  ";

    const payload = metadataDraftUpdatePayload(baseline, draft);

    expect(metadataDraftDirtyFields(baseline, draft).communication).toBe(true);
    expect(payload).toEqual({
      communication: {
        bodyFormat: "html",
        commentBody: "Checked the logs.",
        replyBody: "Thanks for the report.",
      },
      ticketExternalId: "ticket-1",
    });
  });

  it("combines staged metadata and communication text in one update payload", () => {
    const baseline = metadataDraftFromDetail(selectedDetailProps().detail);
    const draft = metadataDraftFromBaseline(baseline);
    draft.metadata.priority = "high";
    draft.communication.replyBody = "Thanks for the report.";

    const payload = metadataDraftUpdatePayload(baseline, draft);

    expect(payload).toEqual({
      communication: {
        bodyFormat: "html",
        replyBody: "Thanks for the report.",
      },
      metadata: {
        priority: "high",
      },
      ticketExternalId: "ticket-1",
    });
  });
});
