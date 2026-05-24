import { requireCurrentUser } from "@/auth/current-user";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import {
  ClearConnectionMessageQuery,
  ConnectionList,
  ConnectionPageShell,
  helpdeskConnectionMessage,
  listConnectionsForUser,
} from "@/features/helpdesk-connections";
import { providerRegistry } from "@/providers";

type ConnectionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConnectionsPage({
  searchParams,
}: ConnectionsPageProps) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const connections = await listConnectionsForUser(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    user.id,
  );
  const success = helpdeskConnectionMessage(params.success);
  const error = helpdeskConnectionMessage(params.error);

  return (
    <ConnectionPageShell
      description="Manage the helpdesk workspaces available to your Resolvrr account."
      title="Workspaces"
    >
      {success || error ? <ClearConnectionMessageQuery /> : null}
      {success ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <ConnectionList connections={connections} />
    </ConnectionPageShell>
  );
}
