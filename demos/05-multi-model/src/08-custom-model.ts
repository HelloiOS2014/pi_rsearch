/**
 * Demo 05-08: Custom Model Configuration
 *
 * Configure custom models (local Ollama, fine-tuned endpoints, etc.)
 * via JSON config and register them in the provider registry.
 */

import { printSection, printEvent } from "@pi-tutorial/shared";
import type { UnifiedStreamEvent, StreamConfig } from "./01-provider-adapter.js";
import { ProviderRegistry } from "./02-unified-api.js";

// ── Model config schema ─────────────────────────────────────────────

interface ModelConfig {
  id: string;
  displayName: string;
  api: "openai-compatible" | "anthropic" | "custom";
  baseUrl: string;
  apiKey: string;
  cost: {
    inputPerMillion: number;
    outputPerMillion: number;
  };
  contextWindow: number;
  maxOutputTokens: number;
  supports?: {
    thinking?: boolean;
    tools?: boolean;
    vision?: boolean;
    streaming?: boolean;
  };
}

// ── Simulated models.json ───────────────────────────────────────────

const MODELS_JSON = `{
  "models": [
    {
      "id": "ollama/llama3.2",
      "displayName": "Llama 3.2 (Local via Ollama)",
      "api": "openai-compatible",
      "baseUrl": "http://localhost:11434/v1",
      "apiKey": "ollama",
      "cost": { "inputPerMillion": 0, "outputPerMillion": 0 },
      "contextWindow": 131072,
      "maxOutputTokens": 8192,
      "supports": { "thinking": false, "tools": true, "vision": false, "streaming": true }
    },
    {
      "id": "together/deepseek-r1",
      "displayName": "DeepSeek R1 (via Together AI)",
      "api": "openai-compatible",
      "baseUrl": "https://api.together.xyz/v1",
      "apiKey": "TOGETHER_API_KEY",
      "cost": { "inputPerMillion": 0.55, "outputPerMillion": 2.19 },
      "contextWindow": 65536,
      "maxOutputTokens": 8192,
      "supports": { "thinking": true, "tools": false, "vision": false, "streaming": true }
    },
    {
      "id": "fireworks/qwen2.5-72b",
      "displayName": "Qwen 2.5 72B (via Fireworks)",
      "api": "openai-compatible",
      "baseUrl": "https://api.fireworks.ai/inference/v1",
      "apiKey": "FIREWORKS_API_KEY",
      "cost": { "inputPerMillion": 0.90, "outputPerMillion": 0.90 },
      "contextWindow": 32768,
      "maxOutputTokens": 4096,
      "supports": { "thinking": false, "tools": true, "vision": false, "streaming": true }
    }
  ]
}`;

// ── Load and register custom models ─────────────────────────────────

function loadModels(jsonString: string): ModelConfig[] {
  const parsed = JSON.parse(jsonString);
  return parsed.models as ModelConfig[];
}

/**
 * Create a mock stream adapter for any OpenAI-compatible model.
 * In production, this would use the OpenAI SDK with a custom baseURL.
 */
function createOpenAICompatibleAdapter(model: ModelConfig): (config: StreamConfig) => AsyncIterable<UnifiedStreamEvent> {
  return async function* (config: StreamConfig): AsyncIterable<UnifiedStreamEvent> {
    // In production:
    //   const client = new OpenAI({ baseURL: model.baseUrl, apiKey: resolveKey(model.apiKey) });
    //   const stream = client.chat.completions.create({ model: model.id.split("/")[1], ... });

    // Mock response showing what would happen
    const response = `[${model.displayName}] Response via ${model.baseUrl} for: "${config.messages.at(-1)?.content}"`;
    const words = response.split(" ");
    let fullText = "";

    for (const word of words) {
      const delta = word + " ";
      fullText += delta;
      yield { type: "text_delta", delta };
      await new Promise((r) => setTimeout(r, 25));
    }

    yield {
      type: "done",
      text: fullText.trim(),
      usage: { inputTokens: 50, outputTokens: words.length * 2 },
    };
  };
}

function resolveApiKey(keyRef: string): string {
  // If it looks like an env var name, try to resolve it
  if (keyRef === keyRef.toUpperCase() && keyRef.includes("_")) {
    return process.env[keyRef] ?? `MOCK_${keyRef}`;
  }
  return keyRef; // Literal key (like "ollama")
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  printSection("Demo 05-08: Custom Model Configuration");

  // Show the config format
  console.log("Model configuration schema:\n");
  console.log("  {");
  console.log('    id:              "ollama/llama3.2"');
  console.log('    displayName:     "Llama 3.2 (Local)"');
  console.log('    api:             "openai-compatible" | "anthropic" | "custom"');
  console.log('    baseUrl:         "http://localhost:11434/v1"');
  console.log('    apiKey:          "ollama" or "ENV_VAR_NAME"');
  console.log("    cost:            { inputPerMillion, outputPerMillion }");
  console.log("    contextWindow:   131072");
  console.log("    maxOutputTokens: 8192");
  console.log("    supports:        { thinking, tools, vision, streaming }");
  console.log("  }");

  // Load models from JSON
  printSection("Loading models.json");

  const models = loadModels(MODELS_JSON);

  for (const model of models) {
    console.log(`\n  ${model.id}`);
    console.log(`    Name:     ${model.displayName}`);
    console.log(`    API:      ${model.api}`);
    console.log(`    Base URL: ${model.baseUrl}`);
    console.log(`    API Key:  ${resolveApiKey(model.apiKey)}`);
    console.log(`    Context:  ${model.contextWindow.toLocaleString()} tokens`);
    console.log(`    Cost:     $${model.cost.inputPerMillion}/M in, $${model.cost.outputPerMillion}/M out`);
    console.log(`    Supports: ${Object.entries(model.supports ?? {}).filter(([, v]) => v).map(([k]) => k).join(", ") || "basic"}`);
  }

  // Register in provider registry
  printSection("Registering Custom Models in Provider Registry");

  const registry = new ProviderRegistry();

  for (const model of models) {
    if (model.api === "openai-compatible") {
      const providerId = model.id.split("/")[0]; // "ollama", "together", etc.
      registry.register(providerId, createOpenAICompatibleAdapter(model));
      printEvent("REGISTER", `${model.id} → provider "${providerId}"`);
    }
  }

  console.log(`\nAvailable providers: [${registry.list().join(", ")}]`);

  // Use a custom model through the unified API
  printSection("Using Custom Model via Unified API");

  const messages: StreamConfig["messages"] = [
    { role: "user", content: "Explain PKCE in one sentence." },
  ];

  for (const provider of registry.list()) {
    console.log(`\n--- ${provider} ---`);

    let output = "";
    for await (const event of registry.stream(provider, "default", messages)) {
      switch (event.type) {
        case "text_delta":
          process.stdout.write(event.delta);
          output += event.delta;
          break;
        case "done":
          console.log();
          printEvent("DONE", `${event.usage.inputTokens} in / ${event.usage.outputTokens} out`);
          break;
      }
    }
  }

  // Show capability checking
  printSection("Capability Checking");

  for (const model of models) {
    const caps = model.supports ?? {};
    console.log(`\n${model.displayName}:`);

    if (caps.thinking) {
      console.log("  [x] Thinking — can use extended reasoning");
    } else {
      console.log("  [ ] Thinking — will use standard mode");
    }

    if (caps.tools) {
      console.log("  [x] Tools — can use function calling");
    } else {
      console.log("  [ ] Tools — tool calls will be simulated via prompting");
    }

    if (caps.vision) {
      console.log("  [x] Vision — can process images");
    } else {
      console.log("  [ ] Vision — images will be converted to descriptions");
    }
  }

  printSection("Key Insight");
  console.log("Custom models use the SAME unified API as built-in providers.");
  console.log("Add a model by dropping a config into models.json:\n");
  console.log("  1. Define the model config (id, baseUrl, apiKey, cost, ...)");
  console.log("  2. Register it in the provider registry");
  console.log('  3. Use it: registry.stream("ollama", "llama3.2", messages)');
  console.log("\nLocal models, fine-tuned endpoints, and third-party APIs");
  console.log("all work through the same interface.");
}

main().catch(console.error);
