import Link from "next/link";
import type { ConnectionProviderOption } from "../service";

type ConnectionFormProps = {
  action(formData: FormData): void | Promise<void>;
  connection?: {
    id: string;
    providerKey: string;
    displayName: string;
    baseUrl: string;
  };
  providers: ConnectionProviderOption[];
};

function firstScheme(providers: ConnectionProviderOption[]) {
  return providers[0]?.credentialSchemes[0] ?? null;
}

export function ConnectionForm({
  action,
  connection,
  providers,
}: ConnectionFormProps) {
  const selectedProvider =
    providers.find((provider) => provider.key === connection?.providerKey) ??
    providers[0];
  const selectedScheme = selectedProvider?.credentialSchemes[0] ?? firstScheme(providers);
  const editing = Boolean(connection);

  return (
    <form action={action} className="rounded-md border border-slate-200 bg-white p-4">
      {connection ? (
        <input name="connectionId" type="hidden" value={connection.id} />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm">Workspace name</span>
          <input
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            defaultValue={connection?.displayName}
            name="displayName"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm">Provider</span>
          <select
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            defaultValue={selectedProvider?.key}
            disabled={editing}
            name={editing ? undefined : "providerKey"}
            required
          >
            {providers.map((provider) => (
              <option key={provider.key} value={provider.key}>
                {provider.label}
              </option>
            ))}
          </select>
          {editing ? (
            <input name="providerKey" type="hidden" value={selectedProvider?.key} />
          ) : null}
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm">Base URL</span>
          <input
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            defaultValue={connection?.baseUrl}
            name="baseUrl"
            placeholder="https://helpdesk.example.com"
            required
            type="url"
          />
        </label>
      </div>

      {selectedScheme ? (
        <fieldset className="mt-5 border-t border-slate-200 pt-4">
          <legend className="text-sm">{selectedScheme.label}</legend>
          <input name="credentialScheme" type="hidden" value={selectedScheme.key} />
          {editing ? (
            <p className="mt-1 text-sm text-slate-500">
              Credential fields are blank for security. Leave all blank to keep
              the current encrypted credentials.
            </p>
          ) : null}
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {selectedScheme.fields.map((field) => (
              <label className="block" key={field.name}>
                <span className="text-sm">{field.label}</span>
                <input
                  autoComplete="off"
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  name={field.name}
                  required={!editing && field.required}
                  type={field.type === "password" ? "password" : "text"}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link className="text-sm text-slate-600" href="/workspace/connections">
          Cancel
        </Link>
        <button
          className="h-10 rounded-md border border-indigo-600 bg-indigo-600 px-4 text-sm text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          type="submit"
        >
          {editing ? "Save workspace" : "Connect workspace"}
        </button>
      </div>
    </form>
  );
}
