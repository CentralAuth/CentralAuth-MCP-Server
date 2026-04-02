import { config as loadDotEnv } from "dotenv";
import { z } from "zod";
import type { ServerConfig } from "./types.js";

loadDotEnv();

const envSchema = z.object({
  CENTRALAUTH_API_KEY: z.string().trim().min(1).optional(),
  CENTRALAUTH_API_BASE_URL: z.string().trim().url().optional(),
  CENTRALAUTH_AUTH_BASE_URL: z.string().trim().url().optional(),
  CENTRALAUTH_CLIENT_ID: z.string().trim().min(1).optional(),
  CENTRALAUTH_CLIENT_SECRET: z.string().trim().min(1).optional(),
  CENTRALAUTH_CALLBACK_URL: z.string().trim().url().optional(),
  CENTRALAUTH_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
});

export function loadConfig(): ServerConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `- ${issue.path.join(".") || "env"}: ${issue.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return {
    apiKey: parsed.data.CENTRALAUTH_API_KEY,
    apiBaseUrl: parsed.data.CENTRALAUTH_API_BASE_URL ?? "https://centralauth.com/api",
    authBaseUrl: parsed.data.CENTRALAUTH_AUTH_BASE_URL ?? "https://centralauth.com",
    clientId: parsed.data.CENTRALAUTH_CLIENT_ID,
    clientSecret: parsed.data.CENTRALAUTH_CLIENT_SECRET,
    callbackUrl: parsed.data.CENTRALAUTH_CALLBACK_URL,
    timeoutMs: parsed.data.CENTRALAUTH_TIMEOUT_MS ?? 15_000,
  };
}

export function hasOAuthConfig(config: ServerConfig): boolean {
  return Boolean(config.clientId && config.clientSecret && config.callbackUrl);
}
