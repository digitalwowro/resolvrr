import type { AppEnv } from "@/config/env";

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
        | "missing-anthropic-compatible-config"
        | "missing-openai-compatible-config";
    };

export function aiRuntimeConfigFromEnv(env: AppEnv): AiRuntimeConfig {
  if (env.AI_PROVIDER === "openai-compatible") {
    if (!env.AI_OPENAI_API_KEY || !env.AI_OPENAI_MODEL) {
      return {
        status: "unconfigured",
        reason: "missing-openai-compatible-config",
      };
    }

    return {
      status: "available",
      apiKey: env.AI_OPENAI_API_KEY,
      baseUrl: env.AI_OPENAI_BASE_URL,
      model: env.AI_OPENAI_MODEL,
      provider: "openai-compatible",
    };
  }

  if (env.AI_PROVIDER === "anthropic-compatible") {
    if (!env.AI_ANTHROPIC_API_KEY || !env.AI_ANTHROPIC_MODEL) {
      return {
        status: "unconfigured",
        reason: "missing-anthropic-compatible-config",
      };
    }

    return {
      status: "available",
      apiKey: env.AI_ANTHROPIC_API_KEY,
      baseUrl: env.AI_ANTHROPIC_BASE_URL,
      model: env.AI_ANTHROPIC_MODEL,
      provider: "anthropic-compatible",
    };
  }

  return { status: "unconfigured", reason: "ai-disabled" };
}
