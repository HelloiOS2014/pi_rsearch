/**
 * System prompt builder — constructs the agent's system prompt
 * dynamically based on enabled tools and context.
 */

const TOOL_GUIDELINES: Record<string, string> = {
  read_file:
    "- Always read a file before attempting to modify it.\n" +
    "- Use offset/limit for large files instead of reading everything.",
  write_file:
    "- Prefer editing existing files over creating new ones.\n" +
    "- Always use absolute file paths.",
  bash:
    "- Prefer the search tool over `grep` or `find` commands.\n" +
    "- Use bash for running tests, installing packages, or git operations.\n" +
    "- Always quote file paths with spaces.",
  search:
    "- Use search to find code patterns, function definitions, and references.\n" +
    "- Use the glob parameter to narrow results to specific file types.",
};

export interface PromptOptions {
  tools: string[];
  workingDirectory?: string;
}

export function buildSystemPrompt(options: PromptOptions): string {
  const { tools, workingDirectory = process.cwd() } = options;
  const date = new Date().toISOString().split("T")[0];

  let prompt = `You are a helpful coding assistant with access to tools for reading, writing, searching, and executing code.

Environment:
- Date: ${date}
- Working directory: ${workingDirectory}
- Platform: ${process.platform}

Guidelines:
- Be concise and direct in your responses.
- When modifying code, explain what you changed and why.
- If a task is ambiguous, ask for clarification before proceeding.
- Always verify your changes work (e.g., run tests or typecheck).
`;

  // Add tool-specific guidelines
  const relevantGuidelines = tools
    .map((t) => TOOL_GUIDELINES[t])
    .filter(Boolean);

  if (relevantGuidelines.length > 0) {
    prompt += `\nTool usage:\n${relevantGuidelines.join("\n")}\n`;
  }

  return prompt;
}
