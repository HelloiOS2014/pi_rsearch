export function printSection(title: string): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}\n`);
}

export function printEvent(type: string, detail?: string): void {
  const timestamp = new Date().toISOString().slice(11, 23);
  console.log(`[${timestamp}] ${type}${detail ? `: ${detail}` : ""}`);
}
