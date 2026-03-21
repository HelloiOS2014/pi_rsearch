/**
 * API key management — resolves API key from env or config file.
 * Returns key or throws with a helpful error message.
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_PATH = join(homedir(), ".pi-tutorial", "config.json");

const PROVIDER_ENV_VARS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GEMINI_API_KEY",
};

/** Get the API key for a provider. Returns null if not found. */
export async function getApiKey(
  provider: string = "anthropic",
): Promise<string | null> {
  // 1. Check environment variable
  const envVar =
    PROVIDER_ENV_VARS[provider] ?? `${provider.toUpperCase()}_API_KEY`;
  const envKey = process.env[envVar];
  if (envKey) return envKey;

  // 2. Check config file
  if (existsSync(CONFIG_PATH)) {
    try {
      const content = await readFile(CONFIG_PATH, "utf-8");
      const config = JSON.parse(content);
      if (config.apiKey) return config.apiKey as string;
      if (config.apiKeys?.[provider])
        return config.apiKeys[provider] as string;
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

/** Get the API key or throw with a helpful error. */
export async function requireApiKey(provider: string = "anthropic"): Promise<string> {
  const key = await getApiKey(provider);
  if (key) return key;

  const envVar =
    PROVIDER_ENV_VARS[provider] ?? `${provider.toUpperCase()}_API_KEY`;

  throw new Error(
    `No API key found for provider "${provider}".\n\n` +
      `Set it via:\n` +
      `  1. Environment variable: export ${envVar}=your-key\n` +
      `  2. Config file: ~/.pi-tutorial/config.json { "apiKey": "your-key" }\n`,
  );
}

/** Check if we're in mock mode (no real API key available). */
export async function isMockMode(provider: string = "anthropic"): Promise<boolean> {
  const key = await getApiKey(provider);
  return !key;
}
