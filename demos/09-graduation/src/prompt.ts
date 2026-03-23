/**
 * System Prompt 构建器
 *
 * TODO: 修改角色定义和工具使用指南，让 Agent 符合你的场景
 */

// TODO: 修改角色定义 — 描述你的 Agent 是谁、做什么
const ROLE = `你是一个通用助手。请根据用户的需求，使用可用的工具来完成任务。`;

// TODO: 添加你的工具使用指南 — 工具名 → 使用建议
const TOOL_GUIDELINES: Record<string, string> = {
  // 示例：
  // read_csv: "- 先读取 CSV 的前几行了解数据结构\n- 统计前先确认数据类型",
  // exec_cmd: "- 只执行只读命令，不要修改系统状态\n- 先检查命令是否安全",
};

/**
 * 构建 system prompt
 * 根据启用的工具动态添加对应的使用指南
 */
export function buildSystemPrompt(toolNames: string[]): string {
  const date = new Date().toISOString().split("T")[0];

  let prompt = `${ROLE}

环境信息：
- 日期：${date}
- 工作目录：${process.cwd()}

行为准则：
- 简洁直接地回答问题
- 如果任务不明确，先询问用户再执行
- 工具执行失败时，告知用户原因并建议替代方案
`;

  // 按工具名过滤，只注入相关的使用指南
  const guidelines = toolNames
    .map((name) => TOOL_GUIDELINES[name])
    .filter(Boolean);

  if (guidelines.length > 0) {
    prompt += `\n工具使用指南：\n${guidelines.join("\n")}\n`;
  }

  return prompt;
}
