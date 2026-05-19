import { requireCurrentUser } from "@/auth/current-user";
import { StaticWorkspace } from "@/features/workspace";

export default async function WorkspacePage() {
  const user = await requireCurrentUser();

  return <StaticWorkspace userEmail={user.email} />;
}
