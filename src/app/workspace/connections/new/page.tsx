import { requireCurrentUser } from "@/auth/current-user";
import {
  ClearConnectionMessageQuery,
  ConnectionForm,
  ConnectionPageShell,
  createHelpdeskConnectionAction,
  helpdeskConnectionMessage,
  listConnectionProviderOptions,
} from "@/features/helpdesk-connections";
import { providerRegistry } from "@/providers";

type NewConnectionPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewConnectionPage({
  searchParams,
}: NewConnectionPageProps) {
  await requireCurrentUser();
  const params = await searchParams;
  const error = helpdeskConnectionMessage(params.error);

  return (
    <ConnectionPageShell
      description="Connect a helpdesk workspace. Credentials are encrypted server-side."
      title="Add workspace"
    >
      {error ? <ClearConnectionMessageQuery /> : null}
      {error ? (
        <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <ConnectionForm
        action={createHelpdeskConnectionAction}
        providers={listConnectionProviderOptions(providerRegistry)}
      />
    </ConnectionPageShell>
  );
}
