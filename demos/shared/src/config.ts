export function getApiKey(provider: string = "anthropic"): string {
  const envMap: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
  };

  const envVar = envMap[provider] ?? `${provider.toUpperCase()}_API_KEY`;
  const key = process.env[envVar];

  if (!key) {
    console.warn(`No API key found for ${provider} (${envVar}). Using mock mode.`);
    return "MOCK_MODE";
  }

  return key;
}

export function isMockMode(): boolean {
  return !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY;
}

/**
 * Creates a mock async iterable that simulates LLM streaming.
 * Used for testing demos without API keys.
 */
export async function* createMockStream(response: string) {
  const words = response.split(" ");
  for (const word of words) {
    yield { type: "text_delta" as const, delta: word + " " };
    await new Promise((r) => setTimeout(r, 50));
  }
  yield { type: "done" as const, text: response };
}
