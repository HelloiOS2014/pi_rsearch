/**
 * File reading tool — reads file contents with line numbers.
 * Supports offset/limit for large files and image detection.
 */
import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const MAX_LINES = 2000;

export interface ReadToolInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

export const readToolSchema = {
  name: "read_file" as const,
  description:
    "Read a file's contents with line numbers. Supports offset/limit for large files. " +
    "Returns base64 for image files (png, jpg, gif, webp).",
  input_schema: {
    type: "object" as const,
    properties: {
      file_path: {
        type: "string" as const,
        description: "Absolute path to the file to read",
      },
      offset: {
        type: "number" as const,
        description: "Line number to start reading from (1-based, default: 1)",
      },
      limit: {
        type: "number" as const,
        description: `Max lines to return (default/max: ${MAX_LINES})`,
      },
    },
    required: ["file_path"] as const,
  },
};

export async function executeRead(input: ReadToolInput): Promise<string> {
  const { file_path, offset = 1, limit = MAX_LINES } = input;
  const ext = extname(file_path).toLowerCase();

  // Check file exists
  try {
    await stat(file_path);
  } catch {
    return `Error: File not found: ${file_path}`;
  }

  // Image files: return base64
  if (IMAGE_EXTENSIONS.has(ext)) {
    const buffer = await readFile(file_path);
    const base64 = buffer.toString("base64");
    return `[Image file: ${file_path} (${buffer.length} bytes, base64 encoded)]\n${base64}`;
  }

  // Text files: read with line numbers
  const content = await readFile(file_path, "utf-8");
  const allLines = content.split("\n");
  const startIdx = Math.max(0, offset - 1);
  const effectiveLimit = Math.min(limit, MAX_LINES);
  const lines = allLines.slice(startIdx, startIdx + effectiveLimit);

  const numbered = lines.map((line, i) => {
    const lineNum = startIdx + i + 1;
    return `${String(lineNum).padStart(6)} | ${line}`;
  });

  const result = numbered.join("\n");
  const totalLines = allLines.length;

  let header = `File: ${file_path} (${totalLines} lines)`;
  if (startIdx > 0 || startIdx + effectiveLimit < totalLines) {
    header += ` [showing lines ${startIdx + 1}-${Math.min(startIdx + effectiveLimit, totalLines)}]`;
  }
  if (totalLines > startIdx + effectiveLimit) {
    header += ` (${totalLines - startIdx - effectiveLimit} more lines)`;
  }

  return `${header}\n${result}`;
}
