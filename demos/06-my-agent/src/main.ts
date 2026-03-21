/**
 * CLI entry point — interactive REPL for the coding agent.
 * Supports session persistence, mock mode, and slash commands.
 */
import { createInterface } from "node:readline";
import { Agent, type AgentEvent } from "./agent.js";
import { Session } from "./session.js";
import { resolveConfig } from "./config-resolver.js";
import { isMockMode } from "./auth-manager.js";

// ── Argument parsing ─────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--model" && args[i + 1]) {
      flags.model = args[++i];
    } else if (arg === "--continue") {
      flags.continue = true;
    } else if (arg === "--no-session") {
      flags.noSession = true;
    } else if (!arg.startsWith("--")) {
      // Positional arg treated as initial prompt
      flags.prompt = arg;
    }
  }

  return flags;
}

// ── Mock agent responses ─────────────────────────────────────
const MOCK_RESPONSES = [
  "I see you're running in mock mode (no API key). Here's what I would do:\n\n" +
    "1. Read the relevant files to understand the codebase\n" +
    "2. Search for related patterns\n" +
    "3. Make the requested changes\n" +
    "4. Verify the changes compile/pass tests\n\n" +
    "To use a real model, set ANTHROPIC_API_KEY in your environment.",
  "In mock mode, I can't actually execute tools, but the agent loop is fully wired:\n\n" +
    "- read_file: reads files with line numbers\n" +
    "- write_file: writes files with auto-mkdir\n" +
    "- bash: executes shell commands\n" +
    "- search: finds patterns in code\n\n" +
    "Set your API key to see it in action!",
];

// ── Event display ────────────────────────────────────────────
function createEventHandler(): (event: AgentEvent) => void {
  return (event: AgentEvent) => {
    switch (event.type) {
      case "agent_start":
        console.log(`\n[Agent] Using model: ${event.model}`);
        break;
      case "turn_start":
        if (event.turnNumber > 1) {
          console.log(`\n[Agent] Turn ${event.turnNumber}`);
        }
        break;
      case "text_delta":
        process.stdout.write(event.text);
        break;
      case "message_end":
        console.log(); // newline after streamed text
        break;
      case "tool_start":
        console.log(`\n[Tool] ${event.name} ...`);
        break;
      case "tool_end": {
        const preview =
          event.result.length > 200
            ? event.result.slice(0, 200) + "..."
            : event.result;
        console.log(`[Tool] ${event.name} done: ${preview}`);
        break;
      }
      case "agent_end":
        if (event.totalTurns > 1) {
          console.log(`[Agent] Completed in ${event.totalTurns} turns`);
        }
        break;
      case "error":
        console.error(`[Error] ${event.error.message}`);
        break;
    }
  };
}

// ── Slash commands ───────────────────────────────────────────
async function handleSlashCommand(
  command: string,
  session: Session,
): Promise<boolean> {
  const cmd = command.trim().toLowerCase();

  if (cmd === "/exit" || cmd === "/quit") {
    console.log("Goodbye!");
    process.exit(0);
  }

  if (cmd === "/clear") {
    await session.clear();
    console.log("Session cleared.");
    return true;
  }

  if (cmd === "/session") {
    const messages = session.getMessages();
    console.log(`Session: ${messages.length} messages`);
    console.log(`File: ${session.getFilePath()}`);
    return true;
  }

  if (cmd === "/help") {
    console.log(`
Commands:
  /exit, /quit   Exit the agent
  /clear         Clear conversation history
  /session       Show session info
  /help          Show this help message
`);
    return true;
  }

  return false;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const flags = parseArgs();
  const mock = await isMockMode();

  // Resolve config
  const config = await resolveConfig({
    model: flags.model as string | undefined,
    apiKey: mock ? "mock" : undefined,
  });

  // Session setup
  const session = new Session();
  const useSession = !flags.noSession;

  if (useSession && flags.continue) {
    const loaded = await session.load();
    if (loaded.length > 0) {
      console.log(`Resumed session with ${loaded.length} messages.`);
    }
  }

  // Welcome message
  console.log("=".repeat(50));
  console.log("  My Agent - Pi Tutorial Capstone");
  console.log("=".repeat(50));
  console.log(`Model: ${config.model}`);
  console.log(`Mode:  ${mock ? "mock (no API key)" : "live"}`);
  console.log(`Type /help for commands, Ctrl+C to exit.\n`);

  // Handle one-shot prompt from CLI args
  if (flags.prompt) {
    if (mock) {
      console.log(MOCK_RESPONSES[0]);
    } else {
      const agent = new Agent(config, {
        session,
        onEvent: createEventHandler(),
      });
      await agent.prompt(flags.prompt as string);
    }
    return;
  }

  // Interactive REPL
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let mockIdx = 0;
  let agent: Agent | null = null;

  // Graceful Ctrl+C handling
  let pendingAbort = false;
  process.on("SIGINT", () => {
    if (agent && !pendingAbort) {
      pendingAbort = true;
      agent.abort();
      console.log("\n[Interrupted] Aborting current request...");
    } else {
      console.log("\nGoodbye!");
      process.exit(0);
    }
  });

  const promptUser = () => {
    rl.question("> ", async (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        promptUser();
        return;
      }

      // Handle slash commands
      if (trimmed.startsWith("/")) {
        const handled = await handleSlashCommand(trimmed, session);
        if (handled) {
          promptUser();
          return;
        }
        console.log(`Unknown command: ${trimmed}. Type /help for options.`);
        promptUser();
        return;
      }

      // Mock mode
      if (mock) {
        console.log(`\n${MOCK_RESPONSES[mockIdx % MOCK_RESPONSES.length]}\n`);
        mockIdx++;
        promptUser();
        return;
      }

      // Real agent call
      agent = new Agent(config, {
        session,
        onEvent: createEventHandler(),
      });
      pendingAbort = false;

      try {
        await agent.prompt(trimmed);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`\n[Error] ${message}\n`);
      }

      agent = null;
      promptUser();
    });
  };

  promptUser();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
