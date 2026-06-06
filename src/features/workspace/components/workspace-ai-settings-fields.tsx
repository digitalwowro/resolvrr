import { useState } from "react";
import { DropdownSelect, type DropdownOption } from "@/components/ui";
import type { AiProviderProtocol, AiSettingsConfigView } from "@/features/ai";

const inputClass =
  "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";

const providerDefaults: Record<
  AiProviderProtocol,
  {
    baseUrl: string;
    modelOptions: DropdownOption[];
  }
> = {
  "anthropic-compatible": {
    baseUrl: "https://api.anthropic.com/v1",
    modelOptions: [
      { label: "claude-opus-4-8", value: "claude-opus-4-8" },
      { label: "claude-sonnet-4-6", value: "claude-sonnet-4-6" },
      {
        label: "claude-haiku-4-5-20251001",
        value: "claude-haiku-4-5-20251001",
      },
      { label: "claude-haiku-4-5", value: "claude-haiku-4-5" },
    ],
  },
  "openai-compatible": {
    baseUrl: "https://api.openai.com/v1",
    modelOptions: [
      { label: "gpt-5.5", value: "gpt-5.5" },
      { label: "gpt-5.4", value: "gpt-5.4" },
      { label: "gpt-5.4-mini", value: "gpt-5.4-mini" },
      { label: "gpt-5.4-nano", value: "gpt-5.4-nano" },
    ],
  },
};

const providerOptions: Array<DropdownOption & { value: AiProviderProtocol }> = [
  { label: "OpenAI compatible", value: "openai-compatible" },
  { label: "Anthropic compatible", value: "anthropic-compatible" },
];

function modelOptionsFor(protocol: AiProviderProtocol, currentModel: string) {
  const options = providerDefaults[protocol].modelOptions;
  return currentModel && !options.some((option) => option.value === currentModel)
    ? [{ label: currentModel, value: currentModel }, ...options]
    : options;
}

export function WorkspaceAiSettingsFields({
  config,
  disabled,
}: {
  config: AiSettingsConfigView | null;
  disabled: boolean;
}) {
  const initialProtocol = config?.providerProtocol ?? "openai-compatible";
  const [providerProtocol, setProviderProtocol] =
    useState<AiProviderProtocol>(initialProtocol);
  const [model, setModel] = useState(
    config?.model ?? providerDefaults[initialProtocol].modelOptions[0]?.value ?? "",
  );
  const defaults = providerDefaults[providerProtocol];
  const modelOptions = modelOptionsFor(providerProtocol, model);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="block">
        <input name="providerProtocol" type="hidden" value={providerProtocol} />
        <DropdownSelect
          ariaLabel="Provider"
          className="block w-full [&>div]:w-full"
          disabled={disabled}
          label="Provider"
          onValueChange={(value) => {
            const nextProtocol = value as AiProviderProtocol;
            setProviderProtocol(nextProtocol);
            setModel(providerDefaults[nextProtocol].modelOptions[0]?.value ?? "");
          }}
          options={providerOptions}
          triggerClassName={inputClass}
          value={providerProtocol}
        />
      </div>
      <div className="block">
        <input name="model" type="hidden" value={model} />
        <DropdownSelect
          ariaLabel="Model"
          className="block w-full [&>div]:w-full"
          disabled={disabled}
          label="Model"
          onValueChange={setModel}
          options={modelOptions}
          placeholder="Select model"
          triggerClassName={inputClass}
          value={model}
        />
      </div>
      <label className="block">
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
      <label className="block md:col-span-3">
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
