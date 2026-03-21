import { readFileSync, existsSync } from "fs";
import { glob } from "glob";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");
const PI_MONO = resolve(ROOT, "pi-mono");

interface Reference {
  file: string;
  line: number;
  target: string;
  startLine?: number;
  endLine?: number;
}

function extractReferences(mdxPath: string): Reference[] {
  const content = readFileSync(mdxPath, "utf-8");
  const refs: Reference[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    // Match SourceReader file="..." startLine={N} endLine={N}
    const sourceReaderMatch = lines[i].match(
      /file="([^"]+)".*?startLine=\{(\d+)\}.*?endLine=\{(\d+)\}/
    );
    if (sourceReaderMatch) {
      refs.push({
        file: mdxPath,
        line: i + 1,
        target: sourceReaderMatch[1],
        startLine: parseInt(sourceReaderMatch[2]),
        endLine: parseInt(sourceReaderMatch[3]),
      });
    }

    // Match inline file references like `packages/agent/src/agent-loop.ts`
    const inlineMatch = lines[i].match(/`(packages\/[^`]+\.ts)`/g);
    if (inlineMatch) {
      for (const match of inlineMatch) {
        const path = match.replace(/`/g, "");
        refs.push({ file: mdxPath, line: i + 1, target: path });
      }
    }
  }

  return refs;
}

async function main() {
  const mdxFiles = await glob("src/content/chapters/**/*.mdx", { cwd: ROOT });
  let errors = 0;

  for (const mdxFile of mdxFiles) {
    const refs = extractReferences(resolve(ROOT, mdxFile));
    for (const ref of refs) {
      const targetPath = resolve(PI_MONO, ref.target);

      if (!existsSync(targetPath)) {
        console.error(`ERROR: ${ref.file}:${ref.line} references ${ref.target} — file not found`);
        errors++;
        continue;
      }

      if (ref.startLine && ref.endLine) {
        const content = readFileSync(targetPath, "utf-8");
        const lineCount = content.split("\n").length;
        if (ref.endLine > lineCount) {
          console.error(
            `ERROR: ${ref.file}:${ref.line} references ${ref.target} lines ${ref.startLine}-${ref.endLine} but file has only ${lineCount} lines`
          );
          errors++;
        }
      }
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} reference error(s) found.`);
    process.exit(1);
  } else {
    console.log("All references valid.");
  }
}

main();
