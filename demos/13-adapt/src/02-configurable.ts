import { printSection, printEvent } from "@pi-tutorial/shared";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

printSection("Demo 13-02: 可配置的 Agent");

// ===== 1. Layered Settings =====

interface Settings {
  model?: string;
  indentation?: number;
  style?: string;
  buildCommand?: string;
  testCommand?: string;
  disabledTools?: string[];
}

function deepMerge(base: Settings, override: Settings): Settings {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      (result as any)[key] = value;
    }
  }
  return result;
}

const globalSettings: Settings = {
  model: "claude-sonnet-4-5",
  indentation: 2,
  style: "functional",
  buildCommand: "npm run build",
  testCommand: "npm test",
  disabledTools: [],
};

const projectSettings: Settings = {
  indentation: 4,
  style: "oop",
  testCommand: "pnpm test",
  disabledTools: ["bash"],
};

const merged = deepMerge(globalSettings, projectSettings);
console.log("📋 分层配置合并:");
console.log(`   全局: indentation=${globalSettings.indentation}, style=${globalSettings.style}`);
console.log(`   项目: indentation=${projectSettings.indentation}, style=${projectSettings.style}`);
console.log(`   合并: indentation=${merged.indentation}, style=${merged.style}`);
printEvent("config", `测试命令: ${merged.testCommand} (项目覆盖了全局的 npm test)`);

// ===== 2. Dynamic System Prompt =====

function buildDynamicPrompt(settings: Settings, availableTools: string[]): string {
  const lines: string[] = [];
  lines.push("You are a coding assistant.");
  lines.push(`Use ${settings.indentation}-space indentation.`);
  lines.push(`Prefer ${settings.style} programming style.`);
  lines.push(`Run tests with: ${settings.testCommand}`);
  lines.push(`Build with: ${settings.buildCommand}`);

  // Tool-aware guidelines
  const activeTools = availableTools.filter(t => !settings.disabledTools?.includes(t));
  if (activeTools.includes("bash") && activeTools.includes("grep")) {
    lines.push("Prefer grep tool over bash for file search.");
  }
  if (!activeTools.includes("bash")) {
    // DON'T add bash guidelines if bash is disabled!
    lines.push("Note: bash tool is disabled. Use other tools for file operations.");
  }

  return lines.join("\n");
}

const allTools = ["read", "write", "edit", "bash", "grep"];
const prompt = buildDynamicPrompt(merged, allTools);
console.log(`\n📝 动态 System Prompt (${prompt.split("\n").length} 行):`);
prompt.split("\n").forEach(line => console.log(`   ${line}`));
printEvent("prompt", "bash 被禁用 → 没有 bash 相关指令（零噪声）");

// ===== 3. Skills System =====

interface Skill {
  name: string;
  description: string;
  content: string;
}

function discoverSkills(skillsDir: string): Skill[] {
  // Simplified discovery: look for SKILL.md files
  const skills: Skill[] = [];
  if (!fs.existsSync(skillsDir)) return skills;

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
      if (fs.existsSync(skillFile)) {
        const raw = fs.readFileSync(skillFile, "utf-8");
        // Parse frontmatter (simplified)
        const nameMatch = raw.match(/name:\s*(.+)/);
        const descMatch = raw.match(/description:\s*"(.+)"/);
        skills.push({
          name: nameMatch?.[1]?.trim() || entry.name,
          description: descMatch?.[1] || "",
          content: raw,
        });
      }
    }
  }
  return skills;
}

// Create a temporary skill for demo
const tmpSkillDir = path.join(os.tmpdir(), "pi-demo-13-skills", "code-review");
fs.mkdirSync(tmpSkillDir, { recursive: true });
fs.writeFileSync(path.join(tmpSkillDir, "SKILL.md"), `---
name: code-review
description: "Review code for bugs, security issues, and style violations"
---

## Instructions
Review the provided code focusing on:
1. Logic errors and edge cases
2. Security vulnerabilities
3. Style consistency with project conventions
`);

const skills = discoverSkills(path.join(os.tmpdir(), "pi-demo-13-skills"));
console.log(`\n🎯 发现 ${skills.length} 个 Skill:`);
skills.forEach(s => {
  console.log(`   ${s.name}: ${s.description}`);
  printEvent("skill", `元数据常驻 prompt (~${Math.ceil(s.description.length / 4)} tokens)，内容按需加载 (~${Math.ceil(s.content.length / 4)} tokens)`);
});

// ===== 4. Model Selection =====

function parseModelPattern(pattern: string): { model: string; thinkingLevel?: string } {
  // Try full pattern as model first
  const parts = pattern.split(":");
  if (parts.length === 1) return { model: pattern };

  // Last colon might be thinking level
  const suffix = parts[parts.length - 1];
  const validLevels = ["low", "medium", "high", "max"];
  if (validLevels.includes(suffix)) {
    return { model: parts.slice(0, -1).join(":"), thinkingLevel: suffix };
  }
  return { model: pattern };
}

console.log("\n🤖 模型选择:");
for (const input of ["claude-sonnet-4-5", "claude-opus:high", "gpt-4o"]) {
  const parsed = parseModelPattern(input);
  console.log(`   "${input}" → model=${parsed.model}${parsed.thinkingLevel ? `, thinking=${parsed.thinkingLevel}` : ""}`);
}

// Cleanup
fs.rmSync(path.join(os.tmpdir(), "pi-demo-13-skills"), { recursive: true, force: true });

// Summary
console.log("\n" + "=".repeat(60));
console.log("对比 01-hardcoded：");
console.log("✅ 分层配置：项目覆盖全局，无需改代码");
console.log("✅ 动态 Prompt：禁用 bash → bash 指令自动消失");
console.log("✅ Skills：添加工作流不影响现有功能");
console.log("✅ 模型选择：pattern 解析支持 model:thinking-level");
