import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceCommunicationDraftController } from
  "@/features/workspace/components/workspace-communication-draft-controller";

const persistence = vi.hoisted(() => ({
  clearPersistedCommunicationDrafts: vi.fn(),
  putPersistedCommunicationDraft: vi.fn(),
  readPersistedCommunicationDraft: vi.fn(),
}));

vi.mock(
  "@/features/workspace/components/ticket-communication-draft-persistence",
  async (importOriginal) => ({
    ...await importOriginal(),
    ...persistence,
  }),
);

const scope = {
  helpdeskConnectionId: "connection-1",
  identityVersion: "identity-1",
  userId: "user-1",
  workspaceId: "workspace-1",
};

function localRecord() {
  return {
    bodyHtml: "<p>Local draft</p>",
    id: "draft-42",
    kind: "internal-comment" as const,
    localRevision: 1,
    scope: { ...scope, ticketExternalId: "42" },
    suggestions: [],
    updatedAt: Date.now(),
  };
}

describe("workspace communication draft controller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    persistence.clearPersistedCommunicationDrafts.mockResolvedValue({
      status: "available",
      value: undefined,
    });
    persistence.putPersistedCommunicationDraft.mockResolvedValue({
      status: "available",
      value: undefined,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("restores a local draft from the exact browser identity scope", async () => {
    persistence.readPersistedCommunicationDraft.mockResolvedValue({
      status: "available",
      value: localRecord(),
    });
    const controller = new WorkspaceCommunicationDraftController(scope);

    await controller.load("42");

    expect(controller.snapshot("42")).toMatchObject({
      loaded: true,
      record: {
        bodyHtml: "<p>Local draft</p>",
        scope: { ...scope, ticketExternalId: "42" },
      },
      status: "local-only",
    });
    expect(persistence.readPersistedCommunicationDraft).toHaveBeenCalledWith({
      ...scope,
      ticketExternalId: "42",
    });
  });

  it("publishes an in-memory draft before the debounced IndexedDB write", async () => {
    persistence.readPersistedCommunicationDraft.mockResolvedValue({
      status: "available",
      value: undefined,
    });
    const controller = new WorkspaceCommunicationDraftController(scope);

    controller.save({
      bodyHtml: "<p>Local edit</p>",
      kind: "internal-comment",
      scope: { ...scope, ticketExternalId: "42" },
      suggestions: [],
    });

    expect(controller.snapshot("42")).toMatchObject({
      loaded: true,
      record: {
        bodyHtml: "<p>Local edit</p>",
        localRevision: 1,
      },
      status: "local-only",
    });
    expect(persistence.putPersistedCommunicationDraft).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(600);

    expect(persistence.putPersistedCommunicationDraft).toHaveBeenCalledTimes(1);
  });

  it("increments the local revision for subsequent editor changes", () => {
    const controller = new WorkspaceCommunicationDraftController(scope);
    const input = {
      bodyHtml: "<p>First</p>",
      kind: "internal-comment" as const,
      scope: { ...scope, ticketExternalId: "42" },
      suggestions: [],
    };

    controller.save(input);
    controller.save({ ...input, bodyHtml: "<p>Second</p>" });

    expect(controller.snapshot("42").record).toMatchObject({
      bodyHtml: "<p>Second</p>",
      localRevision: 2,
    });
  });

  it("coalesces rapid editor changes into the latest local write", async () => {
    const controller = new WorkspaceCommunicationDraftController(scope);
    const input = {
      bodyHtml: "<p>First</p>",
      kind: "internal-comment" as const,
      scope: { ...scope, ticketExternalId: "42" },
      suggestions: [],
    };

    controller.save(input);
    await vi.advanceTimersByTimeAsync(300);
    controller.save({ ...input, bodyHtml: "<p>Second</p>" });
    await vi.advanceTimersByTimeAsync(599);
    expect(persistence.putPersistedCommunicationDraft).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(persistence.putPersistedCommunicationDraft).toHaveBeenCalledTimes(1);
    expect(persistence.putPersistedCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ bodyHtml: "<p>Second</p>", localRevision: 2 }),
    );
  });

  it("persists sustained typing at the maximum wait boundary", async () => {
    const controller = new WorkspaceCommunicationDraftController(scope);
    const input = {
      bodyHtml: "<p>First</p>",
      kind: "internal-comment" as const,
      scope: { ...scope, ticketExternalId: "42" },
      suggestions: [],
    };

    controller.save(input);
    for (let revision = 2; revision <= 5; revision += 1) {
      await vi.advanceTimersByTimeAsync(400);
      controller.save({ ...input, bodyHtml: `<p>Edit ${revision}</p>` });
    }
    expect(persistence.putPersistedCommunicationDraft).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(400);

    expect(persistence.putPersistedCommunicationDraft).toHaveBeenCalledTimes(1);
    expect(persistence.putPersistedCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ bodyHtml: "<p>Edit 5</p>", localRevision: 5 }),
    );
  });

  it("flushes the latest draft without waiting for the debounce", async () => {
    const controller = new WorkspaceCommunicationDraftController(scope);
    controller.save({
      bodyHtml: "<p>Latest</p>",
      kind: "internal-comment",
      scope: { ...scope, ticketExternalId: "42" },
      suggestions: [],
    });

    await expect(controller.flush("42")).resolves.toBe(true);

    expect(persistence.putPersistedCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ bodyHtml: "<p>Latest</p>" }),
    );
  });

  it("clears only the local browser draft", async () => {
    persistence.readPersistedCommunicationDraft.mockResolvedValue({
      status: "available",
      value: localRecord(),
    });
    const controller = new WorkspaceCommunicationDraftController(scope);
    await controller.load("42");

    await expect(controller.clear("42")).resolves.toBe(true);

    expect(controller.snapshot("42")).toEqual({
      loaded: true,
      status: "local-only",
    });
    expect(persistence.clearPersistedCommunicationDrafts).toHaveBeenCalledWith({
      ...scope,
      ticketExternalId: "42",
    });
  });

  it("retains the in-memory copy when local storage cannot clear it", async () => {
    persistence.readPersistedCommunicationDraft.mockResolvedValue({
      status: "available",
      value: localRecord(),
    });
    persistence.clearPersistedCommunicationDrafts.mockResolvedValue({
      reason: "storage-failed",
      status: "unavailable",
    });
    const controller = new WorkspaceCommunicationDraftController(scope);
    await controller.load("42");

    await expect(controller.clear("42")).resolves.toBe(false);

    expect(controller.snapshot("42")).toMatchObject({
      record: { bodyHtml: "<p>Local draft</p>" },
      status: "local-storage-unavailable",
    });
  });

  it("never restores a confirmed-sent draft when local deletion fails", async () => {
    persistence.readPersistedCommunicationDraft.mockResolvedValue({
      status: "available",
      value: localRecord(),
    });
    persistence.clearPersistedCommunicationDrafts.mockResolvedValue({
      reason: "storage-failed",
      status: "unavailable",
    });
    const controller = new WorkspaceCommunicationDraftController(scope);
    await controller.load("42");

    const clearing = controller.clear("42", { restoreOnFailure: false });
    expect(controller.snapshot("42").record).toBeUndefined();
    await expect(clearing).resolves.toBe(false);
    expect(controller.snapshot("42").record).toBeUndefined();
  });

  it("does not let an in-flight restore resurrect a cleared draft", async () => {
    let resolveRead!: (value: {
      status: "available";
      value: ReturnType<typeof localRecord>;
    }) => void;
    persistence.readPersistedCommunicationDraft.mockReturnValue(
      new Promise((resolve) => { resolveRead = resolve; }),
    );
    const controller = new WorkspaceCommunicationDraftController(scope);

    const loading = controller.load("42");
    const clearing = controller.clear("42", { restoreOnFailure: false });
    resolveRead({ status: "available", value: localRecord() });
    await Promise.all([loading, clearing]);

    expect(controller.snapshot("42").record).toBeUndefined();
  });
});
