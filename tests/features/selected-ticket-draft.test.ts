import { describe, expect, it } from "vitest";
import {
  metadataDraftDirtyFields,
  metadataDraftFromBaseline,
  metadataDraftFromDetail,
  metadataDraftUpdatePayload,
} from "@/features/workspace/components/metadata-draft";
import { selectedDetailProps } from "./ticket-workspace-test-utils";

describe("selected ticket draft model", () => {
  it("stores editable ticket metadata inside a selected-ticket draft", () => {
    const { detail } = selectedDetailProps();

    const draft = metadataDraftFromDetail(detail);

    expect(draft).toEqual({
      metadata: {
        pendingDateTime: {
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          time: "08:00",
        },
        priority: "medium",
        state: "open",
      },
      ticketExternalId: "ticket-1",
    });
  });

  it("tracks dirty fields per editable metadata field", () => {
    const baseline = metadataDraftFromDetail(selectedDetailProps().detail);
    const draft = metadataDraftFromBaseline(baseline);
    draft.metadata.state = "pending_reminder";
    draft.metadata.priority = "high";
    draft.metadata.pendingDateTime = { date: "2099-01-02", time: "09:30" };

    expect(metadataDraftDirtyFields(baseline, draft)).toEqual({
      pendingDate: true,
      pendingTime: true,
      pendingUntil: true,
      priority: true,
      state: true,
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
    draft.metadata.pendingDateTime = { date: "2099-01-02", time: "09:30" };

    const payload = metadataDraftUpdatePayload(baseline, draft);

    expect(payload).toEqual({
      metadata: {
        pendingUntil: new Date("2099-01-02T09:30").toISOString(),
        priority: "high",
        state: "pending_reminder",
      },
      ticketExternalId: "ticket-1",
    });
  });
});
