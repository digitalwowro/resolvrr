import { useId, useState } from "react";
import type { AiProviderProtocol, AiSettingsConfigView } from "@/features/ai";

const inputClass =
  "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";

const providerDefaults: Record<
  AiProviderProtocol,
  {
    baseUrl: string;
    modelOptions: string[];
  }
> = {
  "anthropic-compatible": {
    baseUrl: "https://api.anthropic.com/v1",
    modelOptions: [
      "claude-opus-4-8",
      "claude-sonnet-4-6",
      "claude-haiku-4-5-20251001",
      "claude-haiku-4-5",
    ],
  },
  "openai-compatible": {
    baseUrl: "https://api.openai.com/v1",
    modelOptions: ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano"],
  },
};

export function WorkspaceAiSettingsFields({
  config,
  disabled,
}: {
  config: AiSettingsConfigView | null;
  disabled: boolean;
}) {
  const modelOptionsId = useId();
  const initialProtocol = config?.providerProtocol ?? "openai-compatible";
  const [providerProtocol, setProviderProtocol] =
    useState<AiProviderProtocol>(initialProtocol);
  const defaults = providerDefaults[providerProtocol];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Provider</span>
        <select
          className={inputClass}
          disabled={disabled}
          name="providerProtocol"
          onChange={(event) =>
            setProviderProtocol(event.currentTarget.value as AiProviderProtocol)
          }
          required
          value={providerProtocol}
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
          list={modelOptionsId}
          name="model"
          required
        />
        <datalist id={modelOptionsId}>
          {defaults.modelOptions.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Base URL</span>
        <input
          autoComplete="off"
          className={inputClass}
          defaultValue={config?.baseUrl}
          disabled={disabled}
          name="baseUrl"
          placeholder={defaults.baseUrl}
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
