import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskbarSyncNotice } from "@/features/workspace/components/taskbar-sync-notice";

describe("taskbar synchronization notice", () => {
  it("reports a failed change whose ticket tab is no longer visible", () => {
    render(
      <TaskbarSyncNotice
        conflictIds={[]}
        hiddenUnsynchronizedCount={1}
        incompatible={false}
        onCloseConflict={vi.fn()}
        selectionUnsynchronized={false}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "A ticket-tab change is not synchronized yet.",
    );
  });
});
