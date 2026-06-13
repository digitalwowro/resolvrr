import { useId, useState } from "react";
import { DropdownSelect, type DropdownOption } from "@/components/ui";
import type { AiProviderProtocol, AiSettingsConfigView } from "@/features/ai";

const inputClass =
  "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";
const labelRowClass = "flex h-5 items-center justify-between gap-3";
const labelClass = "text-sm font-medium text-slate-700";

const providerBaseUrls: Record<AiProviderProtocol, string> = {
  "anthropic-compatible": "https://api.anthropic.com/v1",
  "openai-compatible": "https://api.openai.com/v1",
};

const providerOptions: Array<DropdownOption & { value: AiProviderProtocol }> = [
  { label: "OpenAI compatible", value: "openai-compatible" },
  { label: "Anthropic compatible", value: "anthropic-compatible" },
];

const modelDocsLinks = [
  { href: "https://developers.openai.com/api/docs/models", label: "OpenAI" },
  {
    href: "https://platform.claude.com/docs/en/about-claude/models/overview",
    label: "Anthropic",
  },
];

export function WorkspaceAiSettingsFields({
  config,
  disabled,
}: {
  config: AiSettingsConfigView | null;
  disabled: boolean;
}) {
  const modelInputId = useId();
  const baseUrlInputId = useId();
  const initialProtocol = config?.providerProtocol ?? "openai-compatible";
  const [providerProtocol, setProviderProtocol] =
    useState<AiProviderProtocol>(initialProtocol);
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? "");
  const defaultBaseUrl = providerBaseUrls[providerProtocol];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="min-w-0">
        <input name="providerProtocol" type="hidden" value={providerProtocol} />
        <div className={labelRowClass}>
          <span className={labelClass}>Provider</span>
        </div>
        <DropdownSelect
          ariaLabel="Provider"
          className="block w-full [&>div]:max-w-none [&>div]:w-full"
          disabled={disabled}
          onValueChange={(value) => setProviderProtocol(value as AiProviderProtocol)}
          options={providerOptions}
          triggerClassName={inputClass}
          value={providerProtocol}
        />
      </div>
      <div className="min-w-0">
        <div className={labelRowClass}>
          <label className={labelClass} htmlFor={modelInputId}>
            Model
          </label>
          <div className="flex gap-2 text-xs">
            {modelDocsLinks.map((link) => (
              <a
                className="font-medium text-indigo-600 hover:text-indigo-700"
                href={link.href}
                key={link.href}
                rel="noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <input
          autoComplete="off"
          className={inputClass}
          defaultValue={config?.model}
          disabled={disabled}
          id={modelInputId}
          name="model"
          required
          type="text"
        />
      </div>
      <div className="min-w-0">
        <div className={labelRowClass}>
          <label className={labelClass} htmlFor={baseUrlInputId}>
            Base URL
          </label>
          <div className="flex gap-2 text-xs">
            {providerOptions.map((option) => (
              <button
                className="font-medium text-indigo-600 hover:text-indigo-700 disabled:text-slate-400"
                disabled={disabled}
                key={option.value}
                onClick={() => setBaseUrl(providerBaseUrls[option.value])}
                type="button"
              >
                {option.label.replace(" compatible", "")}
              </button>
            ))}
          </div>
        </div>
        <input
          autoComplete="off"
          className={inputClass}
          disabled={disabled}
          id={baseUrlInputId}
          name="baseUrl"
          onChange={(event) => setBaseUrl(event.currentTarget.value)}
          placeholder={defaultBaseUrl}
          required
          type="url"
          value={baseUrl}
        />
      </div>
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
