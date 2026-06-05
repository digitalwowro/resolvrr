import type { AiSettingsConfigView } from "@/features/ai";

const inputClass =
  "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";

export function WorkspaceAiSettingsFields({
  config,
  disabled,
}: {
  config: AiSettingsConfigView | null;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Provider</span>
        <select
          className={inputClass}
          defaultValue={config?.providerProtocol ?? "openai-compatible"}
          disabled={disabled}
          name="providerProtocol"
          required
        >
          <option value="openai-compatible">OpenAI compatible</option>
          <option value="anthropic-compatible">Anthropic compatible</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Model</span>
        <input
          autoComplete="off"
          className={inputClass}
          defaultValue={config?.model}
          disabled={disabled}
          name="model"
          required
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Base URL</span>
        <input
          autoComplete="off"
          className={inputClass}
          defaultValue={config?.baseUrl}
          disabled={disabled}
          name="baseUrl"
          placeholder="https://api.openai.com/v1"
          required
          type="url"
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">API key</span>
        <input
          autoComplete="off"
          className={inputClass}
          disabled={disabled}
          name="apiKey"
          required={!config?.hasApiKey}
          type="password"
        />
        {config?.hasApiKey ? (
          <span className="mt-1 block text-xs text-slate-500">
            Leave blank to keep the current key.
          </span>
        ) : null}
      </label>
    </div>
  );
}
