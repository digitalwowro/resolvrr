import { requireCurrentUser } from "@/auth/current-user";
import { StaticWorkspace } from "@/features/workspace/demo/static-workspace";

export default async function WorkspaceDemoPage() {
  const user = await requireCurrentUser();

  return <StaticWorkspace userEmail={user.email} />;
}
