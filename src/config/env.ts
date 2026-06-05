import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_BASE_URL: z.url(),
  HOSTNAME: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3005),
  ALLOWED_DEV_ORIGINS: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  APP_ENCRYPTION_KEY: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  AI_PROVIDER: z
    .enum(["disabled", "openai-compatible", "anthropic-compatible"])
    .default("disabled"),
  AI_OPENAI_BASE_URL: z.url().default("https://api.openai.com/v1"),
  AI_OPENAI_API_KEY: z.string().min(1).optional(),
  AI_OPENAI_MODEL: z.string().min(1).optional(),
  AI_ANTHROPIC_BASE_URL: z.url().default("https://api.anthropic.com/v1"),
  AI_ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AI_ANTHROPIC_MODEL: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}

export const env = loadEnv();
