export type AiRuntimeConfig =
  | {
      status: "available";
      apiKey: string;
      baseUrl: string;
      model: string;
      provider: "openai-compatible";
    }
  | {
      status: "available";
      apiKey: string;
      baseUrl: string;
      model: string;
      provider: "anthropic-compatible";
    }
  | {
      status: "unconfigured";
      reason:
        | "ai-disabled"
        | "invalid-ai-config"
        | "missing-user-ai-config"
        | "missing-workspace-ai-config"
        | "no-active-workspace";
    };
