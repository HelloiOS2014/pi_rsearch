/**
 * File writing tool — writes content to a file.
 * Auto-creates parent directories if they don't exist.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface WriteToolInput {
  file_path: string;
  content: string;
}

export const writeToolSchema = {
  name: "write_file" as const,
  description:
    "Write content to a file. Creates parent directories if needed. " +
    "Use this for creating new files or completely rewriting existing ones.",
  input_schema: {
    type: "object" as const,
    properties: {
      file_path: {
        type: "string" as const,
        description: "Absolute path to the file to write",
      },
      content: {
        type: "string" as const,
        description: "The content to write to the file",
      },
    },
    required: ["file_path", "content"] as const,
  },
};

export async function executeWrite(input: WriteToolInput): Promise<string> {
  const { file_path, content } = input;

  try {
    // Auto-create parent directories
    const dir = dirname(file_path);
    await mkdir(dir, { recursive: true });

    await writeFile(file_path, content, "utf-8");

    const lines = content.split("\n").length;
    const bytes = Buffer.byteLength(content, "utf-8");
    return `Successfully wrote ${file_path} (${lines} lines, ${bytes} bytes)`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Error writing file: ${message}`;
  }
}
