import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/auth/current-user";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import {
  ClearConnectionMessageQuery,
  ConnectionForm,
  ConnectionPageShell,
  getConnectionForEdit,
  helpdeskConnectionMessage,
  listConnectionProviderOptions,
  updateHelpdeskConnectionAction,
} from "@/features/helpdesk-connections";
import { providerRegistry } from "@/providers";

type EditConnectionPageProps = {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditConnectionPage({
  params,
  searchParams,
}: EditConnectionPageProps) {
  const user = await requireCurrentUser();
  const { connectionId } = await params;
  const connection = await getConnectionForEdit(
    prismaHelpdeskConnectionsRepository,
    user.id,
    connectionId,
  );

  if (!connection) {
    notFound();
  }

  const error = helpdeskConnectionMessage((await searchParams).error);

  return (
    <ConnectionPageShell
      description="Update metadata or replace credentials. Stored credentials are never shown."
      title="Edit workspace"
    >
      {error ? <ClearConnectionMessageQuery /> : null}
      {error ? (
        <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <ConnectionForm
        action={updateHelpdeskConnectionAction}
        connection={connection}
        providers={listConnectionProviderOptions(providerRegistry)}
      />
    </ConnectionPageShell>
  );
}
