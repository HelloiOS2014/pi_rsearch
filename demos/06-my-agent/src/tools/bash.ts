/**
 * Bash command execution tool.
 * Runs shell commands with timeout and output truncation.
 */
import { exec } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 50_000; // 50KB

export interface BashToolInput {
  command: string;
  timeout?: number;
}

export const bashToolSchema = {
  name: "bash" as const,
  description:
    "Execute a shell command. Returns stdout and stderr. " +
    "Commands timeout after 30 seconds by default. Output is truncated to 50KB.",
  input_schema: {
    type: "object" as const,
    properties: {
      command: {
        type: "string" as const,
        description: "The shell command to execute",
      },
      timeout: {
        type: "number" as const,
        description: "Timeout in milliseconds (default: 30000)",
      },
    },
    required: ["command"] as const,
  },
};

function truncateOutput(output: string, maxBytes: number): string {
  const bytes = Buffer.byteLength(output, "utf-8");
  if (bytes <= maxBytes) return output;

  // Keep the last maxBytes of output (tail is more useful)
  const buffer = Buffer.from(output, "utf-8");
  const truncated = buffer.subarray(buffer.length - maxBytes).toString("utf-8");
  const droppedBytes = bytes - maxBytes;
  return `[...truncated ${droppedBytes} bytes...]\n${truncated}`;
}

export function executeBash(input: BashToolInput): Promise<string> {
  const { command, timeout = DEFAULT_TIMEOUT_MS } = input;

  return new Promise((resolve) => {
    exec(
      command,
      {
        timeout,
        maxBuffer: MAX_OUTPUT_BYTES * 2,
        shell: "/bin/bash",
        env: { ...process.env, TERM: "dumb" },
      },
      (error, stdout, stderr) => {
        let result = "";

        if (stdout) {
          result += truncateOutput(stdout, MAX_OUTPUT_BYTES);
        }
        if (stderr) {
          if (result) result += "\n";
          result += `STDERR:\n${truncateOutput(stderr, MAX_OUTPUT_BYTES)}`;
        }
        if (error && error.killed) {
          result += `\n[Command timed out after ${timeout}ms]`;
        } else if (error && !stderr) {
          result += `\nExit code: ${error.code ?? 1}`;
        }

        resolve(result || "(no output)");
      },
    );
  });
}
