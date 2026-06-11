import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ViewDetailsForm } from "@/features/workspace/components/workspace-settings-view-details-form";
import {
  newSavedViewDraft,
  type SavedViewDraft,
} from "@/features/workspace/components/workspace-settings-views-utils";

function DetailsFormHarness() {
  const [draft, setDraft] = useState<SavedViewDraft>(newSavedViewDraft());

  return (
    <ViewDetailsForm
      draft={draft}
      iconOptions={[
        {
          value: "briefcase-business",
          label: "briefcase-business",
          icon: null,
        },
      ]}
      setDraft={setDraft}
      userRole="ADMIN"
    />
  );
}

describe("ViewDetailsForm", () => {
  it("updates the view title without reading from a released event", async () => {
    const user = userEvent.setup();
    render(<DetailsFormHarness />);

    const titleInput = screen.getByLabelText("Title");
    await user.type(titleInput, "My escalations");

    expect(titleInput).toHaveValue("My escalations");
  });
});
