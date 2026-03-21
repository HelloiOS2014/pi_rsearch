/**
 * Batch render all Remotion compositions to MP4.
 * Usage: npx tsx render-batch.ts
 * Output: ../public/videos/{compositionId}.mp4
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = typeof import.meta.dirname === "string"
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));

const OUTPUT_DIR = resolve(__dirname, "../public/videos");
const ENTRY_POINT = resolve(__dirname, "src/index.ts");

// All compositions to render (excluding template components ChapterCard/CodeShowcase)
const COMPOSITIONS = [
  "CourseIntro",
  "WhatIsAgent",
  "PiArchOverview",
  "LoopAnimation",
  "ToolCallFlow",
  "EventTimeline",
  "ProviderAbstract",
  "FullArchitecture",
  "FrameworkCompare",
  "ExtensionArch",
];

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Bundling Remotion project...");
  const bundled = await bundle({ entryPoint: ENTRY_POINT });
  console.log("Bundle complete.\n");

  for (const compositionId of COMPOSITIONS) {
    const outputPath = resolve(OUTPUT_DIR, `${compositionId}.mp4`);

    if (existsSync(outputPath)) {
      console.log(`⏭  ${compositionId}.mp4 already exists, skipping`);
      continue;
    }

    console.log(`🎬 Rendering ${compositionId}...`);
    const composition = await selectComposition({
      serveUrl: bundled,
      id: compositionId,
    });

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outputPath,
    });

    console.log(`✅ ${compositionId}.mp4 rendered\n`);
  }

  console.log("All compositions rendered.");
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
