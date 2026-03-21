/**
 * Code search tool — searches for patterns in files.
 * Combines grep-like text search with file filtering.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const MAX_RESULTS = 100;
const MAX_LINE_LENGTH = 200;
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__", ".venv",
]);
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2",
  ".ttf", ".eot", ".mp3", ".mp4", ".zip", ".tar", ".gz", ".pdf",
]);

export interface SearchToolInput {
  pattern: string;
  path?: string;
  glob?: string;
}

export const searchToolSchema = {
  name: "search" as const,
  description:
    "Search for a text pattern in files. Returns matching lines with file paths and line numbers. " +
    "Searches recursively from the given path. Use glob to filter file types (e.g., '*.ts').",
  input_schema: {
    type: "object" as const,
    properties: {
      pattern: {
        type: "string" as const,
        description: "Text pattern to search for (case-insensitive substring match)",
      },
      path: {
        type: "string" as const,
        description: "Directory to search in (default: current working directory)",
      },
      glob: {
        type: "string" as const,
        description: "File glob pattern to filter (e.g., '*.ts', '*.py')",
      },
    },
    required: ["pattern"] as const,
  },
};

interface SearchMatch {
  file: string;
  line: number;
  text: string;
}

function matchesGlob(filename: string, glob: string): boolean {
  // Simple glob: *.ext or exact match
  if (glob.startsWith("*.")) {
    const ext = glob.slice(1); // e.g., ".ts"
    return filename.endsWith(ext);
  }
  return filename === glob;
}

async function* walkFiles(
  dir: string,
  glob?: string,
): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
        yield* walkFiles(fullPath, glob);
      }
    } else if (entry.isFile()) {
      if (BINARY_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
      if (glob && !matchesGlob(entry.name, glob)) continue;
      yield fullPath;
    }
  }
}

export async function executeSearch(input: SearchToolInput): Promise<string> {
  const { pattern, path: searchPath = process.cwd(), glob } = input;
  const matches: SearchMatch[] = [];
  const lowerPattern = pattern.toLowerCase();

  for await (const filePath of walkFiles(searchPath, glob)) {
    if (matches.length >= MAX_RESULTS) break;

    try {
      const info = await stat(filePath);
      if (info.size > 1_000_000) continue; // Skip files > 1MB

      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (matches.length >= MAX_RESULTS) break;
        if (lines[i].toLowerCase().includes(lowerPattern)) {
          const relPath = relative(searchPath, filePath);
          let text = lines[i].trim();
          if (text.length > MAX_LINE_LENGTH) {
            text = text.slice(0, MAX_LINE_LENGTH) + "...";
          }
          matches.push({ file: relPath, line: i + 1, text });
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  if (matches.length === 0) {
    return `No matches found for "${pattern}" in ${searchPath}`;
  }

  const lines = matches.map(
    (m) => `${m.file}:${m.line}: ${m.text}`,
  );

  let result = `Found ${matches.length} match${matches.length === 1 ? "" : "es"}`;
  if (matches.length >= MAX_RESULTS) {
    result += ` (showing first ${MAX_RESULTS})`;
  }
  result += `:\n\n${lines.join("\n")}`;
  return result;
}
