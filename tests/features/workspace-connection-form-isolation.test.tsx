import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceConnectionForm } from "@/features/workspace/components/workspace-connection-form";

const providers = [{
  credentialSchemes: [{
    fields: [
      { label: "Username", name: "username", required: true, type: "text" as const },
      { label: "Password", name: "password", required: true, type: "password" as const },
    ],
    key: "basic-auth",
    label: "Basic Auth",
  }],
  key: "example",
  label: "Example",
}];

const workspace = {
  access: {
    canEditAiRephraseStyleOverrides: false,
    canEditMyStyle: false,
    role: "ADMIN" as const,
  },
  active: true,
  baseUrl: "https://helpdesk.example.com",
  connectionId: null,
  id: "workspace-1",
  label: "Support",
  providerKey: "example",
  providerLabel: "Example",
  status: "disconnected" as const,
};

describe("personal connection form isolation", () => {
  it("lets an admin save shared metadata without supplying personal credentials", () => {
    render(
      <WorkspaceConnectionForm
        action={vi.fn()}
        connection={workspace}
        onCancel={vi.fn()}
        onSubmitResult={vi.fn()}
        pending={false}
        providers={providers}
      />,
    );

    expect(screen.getByLabelText("Username")).not.toBeRequired();
    expect(screen.getByLabelText("Password")).not.toBeRequired();
    expect(screen.getByRole("button", { name: "Save workspace" })).toBeEnabled();
  });

  it("requires credentials when an agent connects their account", () => {
    render(
      <WorkspaceConnectionForm
        action={vi.fn()}
        connection={{
          ...workspace,
          access: { ...workspace.access, role: "AGENT" },
        }}
        onCancel={vi.fn()}
        onSubmitResult={vi.fn()}
        pending={false}
        providers={providers}
      />,
    );

    expect(screen.getByLabelText("Username")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
    expect(screen.getByRole("button", { name: "Connect my account" })).toBeEnabled();
  });
});
