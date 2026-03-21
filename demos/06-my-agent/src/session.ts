/**
 * Simple session persistence — saves/loads conversation messages
 * to a JSONL file for session continuity.
 */
import { readFile, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";

const SESSION_FILE = ".pi-tutorial-session.jsonl";

type Message = Anthropic.MessageParam;

export class Session {
  private filePath: string;
  private messages: Message[] = [];

  constructor(filePath?: string) {
    this.filePath = filePath ?? SESSION_FILE;
  }

  /** Load messages from the session file. Returns empty array if no session. */
  async load(): Promise<Message[]> {
    if (!existsSync(this.filePath)) {
      this.messages = [];
      return [];
    }

    try {
      const content = await readFile(this.filePath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      this.messages = lines.map((line) => JSON.parse(line) as Message);
      return this.messages;
    } catch {
      this.messages = [];
      return [];
    }
  }

  /** Append a message to the session. */
  async append(message: Message): Promise<void> {
    this.messages.push(message);
    const line = JSON.stringify(message) + "\n";
    await appendFile(this.filePath, line, "utf-8");
  }

  /** Save all messages (overwrite). Used after clearing. */
  async save(messages: Message[]): Promise<void> {
    this.messages = messages;
    const content = messages.map((m) => JSON.stringify(m)).join("\n") + "\n";
    await writeFile(this.filePath, content, "utf-8");
  }

  /** Clear the session file and in-memory messages. */
  async clear(): Promise<void> {
    this.messages = [];
    await writeFile(this.filePath, "", "utf-8");
  }

  /** Get all messages in the current session. */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /** Get the session file path. */
  getFilePath(): string {
    return this.filePath;
  }
}
