import { render } from "@testing-library/react";
import { StaticWorkspace } from "@/features/workspace/demo/static-workspace";

export function renderStaticWorkspace() {
  render(<StaticWorkspace userEmail="agent@example.com" />);
}
