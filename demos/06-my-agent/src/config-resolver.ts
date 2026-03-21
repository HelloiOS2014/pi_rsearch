/**
 * Three-level config resolution:
 *   defaults → user config file → environment variables
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface AgentConfig {
  model: string;
  provider: string;
  apiKey: string;
  maxTokens: number;
  thinkingLevel: "none" | "low" | "medium" | "high";
}

const DEFAULTS: AgentConfig = {
  model: "claude-sonnet-4-20250514",
  provider: "anthropic",
  apiKey: "",
  maxTokens: 8192,
  thinkingLevel: "none",
};

const CONFIG_PATH = join(homedir(), ".pi-tutorial", "config.json");

/** Load user config from ~/.pi-tutorial/config.json */
async function loadUserConfig(): Promise<Partial<AgentConfig>> {
  if (!existsSync(CONFIG_PATH)) return {};

  try {
    const content = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(content) as Partial<AgentConfig>;
  } catch {
    return {};
  }
}

/** Read config values from environment variables. */
function loadEnvConfig(): Partial<AgentConfig> {
  const env: Partial<AgentConfig> = {};

  if (process.env.PI_MODEL) env.model = process.env.PI_MODEL;
  if (process.env.PI_PROVIDER) env.provider = process.env.PI_PROVIDER;
  if (process.env.PI_MAX_TOKENS)
    env.maxTokens = parseInt(process.env.PI_MAX_TOKENS, 10);
  if (process.env.PI_THINKING)
    env.thinkingLevel = process.env.PI_THINKING as AgentConfig["thinkingLevel"];

  // API key from provider-specific env var
  const provider = env.provider ?? DEFAULTS.provider;
  const keyMap: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
  };
  const keyVar = keyMap[provider] ?? `${provider.toUpperCase()}_API_KEY`;
  if (process.env[keyVar]) env.apiKey = process.env[keyVar]!;

  return env;
}

/** Resolve config with three-level merge: defaults → user → env */
export async function resolveConfig(
  overrides?: Partial<AgentConfig>,
): Promise<AgentConfig> {
  const userConfig = await loadUserConfig();
  const envConfig = loadEnvConfig();

  return {
    ...DEFAULTS,
    ...userConfig,
    ...envConfig,
    ...overrides,
  };
}
