/**
 * Agent core — ties together tools, prompt, session, and retry
 * into a complete agentic loop with streaming and events.
 */
import Anthropic from "@anthropic-ai/sdk";
import { readToolSchema, executeRead } from "./tools/read.js";
import { writeToolSchema, executeWrite } from "./tools/write.js";
import { bashToolSchema, executeBash } from "./tools/bash.js";
import { searchToolSchema, executeSearch } from "./tools/search.js";
import { buildSystemPrompt } from "./prompt.js";
import { Session } from "./session.js";
import { withRetry } from "./retry.js";
import type { AgentConfig } from "./config-resolver.js";

// ── Event types ──────────────────────────────────────────────
export type AgentEvent =
  | { type: "agent_start"; model: string }
  | { type: "turn_start"; turnNumber: number }
  | { type: "message_start" }
  | { type: "text_delta"; text: string }
  | { type: "message_end"; text: string }
  | { type: "tool_start"; name: string; id: string }
  | { type: "tool_end"; name: string; result: string }
  | { type: "agent_end"; totalTurns: number }
  | { type: "error"; error: Error };

export type EventHandler = (event: AgentEvent) => void;

// ── Tool definitions ─────────────────────────────────────────
const ALL_TOOLS = [readToolSchema, writeToolSchema, bashToolSchema, searchToolSchema];

const TOOL_EXECUTORS: Record<string, (input: Record<string, unknown>) => Promise<string>> = {
  read_file: (input) => executeRead(input as any),
  write_file: (input) => executeWrite(input as any),
  bash: (input) => executeBash(input as any),
  search: (input) => executeSearch(input as any),
};

// ── Agent class ──────────────────────────────────────────────
export class Agent {
  private client: Anthropic;
  private config: AgentConfig;
  private session: Session;
  private systemPrompt: string;
  private onEvent: EventHandler;
  private abortController: AbortController | null = null;

  constructor(
    config: AgentConfig,
    options?: {
      session?: Session;
      onEvent?: EventHandler;
    },
  ) {
    this.config = config;
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.session = options?.session ?? new Session();
    this.onEvent = options?.onEvent ?? (() => {});
    this.systemPrompt = buildSystemPrompt({
      tools: ALL_TOOLS.map((t) => t.name),
    });
  }

  /** Run the agent with a user prompt. Returns the final text response. */
  async prompt(userMessage: string): Promise<string> {
    this.abortController = new AbortController();
    const messages = this.session.getMessages();

    // Add user message
    const userMsg: Anthropic.MessageParam = {
      role: "user",
      content: userMessage,
    };
    messages.push(userMsg);
    await this.session.append(userMsg);

    this.emit({ type: "agent_start", model: this.config.model });

    let turnNumber = 0;
    const MAX_TURNS = 20;

    while (turnNumber < MAX_TURNS) {
      if (this.abortController.signal.aborted) break;
      turnNumber++;
      this.emit({ type: "turn_start", turnNumber });

      // Call the API with retry
      const response = await withRetry(
        () =>
          this.client.messages.create({
            model: this.config.model,
            max_tokens: this.config.maxTokens,
            system: this.systemPrompt,
            tools: ALL_TOOLS as Anthropic.Messages.Tool[],
            messages,
          }),
        {
          maxRetries: 3,
          onRetry: (err, attempt, delay) => {
            this.emit({
              type: "error",
              error: new Error(
                `Retry ${attempt} in ${Math.round(delay)}ms: ${err.message}`,
              ),
            });
          },
        },
      );

      // Process response content blocks
      this.emit({ type: "message_start" });
      let fullText = "";
      const toolUseBlocks: Anthropic.Messages.ToolUseBlock[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          fullText += block.text;
          this.emit({ type: "text_delta", text: block.text });
        } else if (block.type === "tool_use") {
          toolUseBlocks.push(block);
        }
      }

      if (fullText) {
        this.emit({ type: "message_end", text: fullText });
      }

      // Add assistant message to conversation
      const assistantMsg: Anthropic.MessageParam = {
        role: "assistant",
        content: response.content,
      };
      messages.push(assistantMsg);
      await this.session.append(assistantMsg);

      // If no tool calls, we're done
      if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
        if (toolUseBlocks.length === 0) {
          this.emit({ type: "agent_end", totalTurns: turnNumber });
          return fullText;
        }
      }

      // Execute tool calls
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const toolBlock of toolUseBlocks) {
        if (this.abortController.signal.aborted) break;

        this.emit({ type: "tool_start", name: toolBlock.name, id: toolBlock.id });

        const executor = TOOL_EXECUTORS[toolBlock.name];
        let result: string;

        if (executor) {
          try {
            result = await executor(toolBlock.input as Record<string, unknown>);
          } catch (err) {
            result = `Error: ${err instanceof Error ? err.message : String(err)}`;
          }
        } else {
          result = `Unknown tool: ${toolBlock.name}`;
        }

        this.emit({ type: "tool_end", name: toolBlock.name, result });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: result,
        });
      }

      // Add tool results to conversation
      const toolMsg: Anthropic.MessageParam = {
        role: "user",
        content: toolResults,
      };
      messages.push(toolMsg);
      await this.session.append(toolMsg);
    }

    this.emit({ type: "agent_end", totalTurns: turnNumber });
    return "(max turns reached)";
  }

  /** Abort the current agent run. */
  abort(): void {
    this.abortController?.abort();
  }

  /** Get the session instance. */
  getSession(): Session {
    return this.session;
  }

  private emit(event: AgentEvent): void {
    try {
      this.onEvent(event);
    } catch {
      // Don't let event handler errors crash the agent
    }
  }
}
