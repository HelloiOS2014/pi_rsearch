/**
 * read_csv 工具 — 读取 CSV 文件并返回前 N 行
 * 这是一个完整的工具实现示例。复制这个文件来创建你自己的工具。
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "fs";

// Step 1: 定义工具 Schema（LLM 通过这个理解工具的用途和参数）
export const readCsvSchema: Anthropic.Tool = {
  name: "read_csv",
  description: "读取 CSV 文件，返回表头和前 N 行数据。用于了解数据结构和内容。",
  input_schema: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "CSV 文件路径" },
      limit: { type: "number", description: "返回的最大行数（默认 5）" },
    },
    required: ["path"],
  },
};

// Step 2: 实现工具执行函数（接收 LLM 传来的参数，返回字符串结果）
export async function executeReadCsv(input: {
  path: string;
  limit?: number;
}): Promise<string> {
  const { path, limit = 5 } = input;

  // 错误处理：文件不存在时返回错误信息（不要 throw，让 LLM 看到错误并调整策略）
  if (!existsSync(path)) {
    return `Error: 文件 "${path}" 不存在。请检查路径是否正确。`;
  }

  try {
    const content = readFileSync(path, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());
    const header = lines[0];
    const dataLines = lines.slice(1, limit + 1);

    return [
      `文件: ${path}`,
      `总行数: ${lines.length - 1}（不含表头）`,
      `显示前 ${dataLines.length} 行:`,
      "",
      header,
      ...dataLines,
    ].join("\n");
  } catch (err) {
    return `Error: 读取文件失败 — ${(err as Error).message}`;
  }
}
