/**
 * Demo 05-06: Unicode Surrogate Pair Sanitization
 *
 * Problem: Some data sources (LinkedIn profiles, web scraping) contain
 * strings with unpaired Unicode surrogates. These crash JSON.stringify(),
 * which means they crash API requests to any LLM provider.
 *
 * Solution: Detect and remove unpaired surrogates before sending to APIs.
 */

import { printSection, printEvent } from "@pi-tutorial/shared";

// ── The problem ─────────────────────────────────────────────────────

/**
 * Unicode surrogate pairs (U+D800 to U+DFFF) are used in UTF-16 to
 * represent characters outside the Basic Multilingual Plane (like emoji).
 *
 * A valid surrogate pair: high surrogate (D800-DBFF) + low surrogate (DC00-DFFF)
 * An UNPAIRED surrogate: high or low surrogate appearing alone
 *
 * JavaScript strings are UTF-16, so unpaired surrogates can exist in memory
 * but they are INVALID in JSON (RFC 8259). JSON.stringify() will include them
 * but the resulting JSON is malformed and may be rejected by APIs.
 */

// ── Sanitization function ───────────────────────────────────────────

/**
 * Remove unpaired Unicode surrogates from a string.
 *
 * Regex breakdown:
 *   [\uD800-\uDBFF](?![\uDC00-\uDFFF])  — High surrogate NOT followed by low surrogate
 *   (?<![\uD800-\uDBFF])[\uDC00-\uDFFF]  — Low surrogate NOT preceded by high surrogate
 */
export function sanitizeUnicode(text: string): string {
  return text
    // Remove high surrogates not followed by low surrogates
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "\uFFFD")
    // Remove low surrogates not preceded by high surrogates
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "\uFFFD");
}

/**
 * Check if a string contains unpaired surrogates.
 */
export function hasUnpairedSurrogates(text: string): boolean {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text);
}

/**
 * Sanitize all string values in an object (deep).
 * Used to clean tool results before sending to LLM APIs.
 */
export function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === "string") {
    return sanitizeUnicode(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeObject(value);
    }
    return result;
  }
  return obj;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  printSection("Demo 05-06: Unicode Surrogate Pair Sanitization");

  console.log("Problem: Unpaired Unicode surrogates crash JSON.stringify()");
  console.log("         and cause LLM API requests to fail.\n");

  // Test 1: Normal emoji (valid surrogate pairs)
  printSection("Test 1: Valid Emoji (Surrogate Pairs)");

  const validEmoji = "Hello! \u{1F600} \u{1F680} \u{1F4BB}"; // grinning, rocket, laptop
  console.log(`Input:  "${validEmoji}"`);
  console.log(`Has unpaired surrogates: ${hasUnpairedSurrogates(validEmoji)}`);
  console.log(`Output: "${sanitizeUnicode(validEmoji)}"`);
  printEvent("OK", "Valid emoji passes through unchanged");

  // Test 2: Strings with unpaired surrogates
  printSection("Test 2: Unpaired Surrogates");

  // Create strings with unpaired surrogates manually
  const highOnly = "Hello\uD800World";  // Lone high surrogate
  const lowOnly = "Hello\uDC00World";   // Lone low surrogate

  console.log("Lone high surrogate (\\uD800):");
  console.log(`  Has unpaired: ${hasUnpairedSurrogates(highOnly)}`);
  console.log(`  Sanitized:    "${sanitizeUnicode(highOnly)}"`);

  console.log("\nLone low surrogate (\\uDC00):");
  console.log(`  Has unpaired: ${hasUnpairedSurrogates(lowOnly)}`);
  console.log(`  Sanitized:    "${sanitizeUnicode(lowOnly)}"`);

  printEvent("FIX", "Unpaired surrogates replaced with U+FFFD (replacement character)");

  // Test 3: Simulated LinkedIn data with mixed content
  printSection("Test 3: Real-World Example — LinkedIn Profile Data");

  const linkedInProfile = {
    name: "Jane Doe",
    headline: `Senior Engineer \uD83D\uDE80 at TechCorp`,  // valid rocket emoji
    about: `Passionate about AI \uD83E\uDD16 and building great products.\uD800 Love coding!`, // unpaired at end
    skills: [
      "TypeScript",
      "React \uDC00Native",  // lone low surrogate
      "Machine Learning \uD83E\uDD16",  // valid robot emoji
    ],
  };

  console.log("Before sanitization:");
  console.log(JSON.stringify(linkedInProfile, null, 2));

  const sanitized = sanitizeObject(linkedInProfile) as typeof linkedInProfile;

  console.log("\nAfter sanitization:");
  console.log(JSON.stringify(sanitized, null, 2));

  // Show which fields were affected
  for (const [key, value] of Object.entries(linkedInProfile)) {
    const original = JSON.stringify(value);
    const clean = JSON.stringify(sanitizeObject(value));
    if (original !== clean) {
      printEvent("CLEANED", `${key}: removed unpaired surrogates`);
    }
  }

  // Test 4: Show JSON.stringify behavior
  printSection("Test 4: JSON.stringify Safety");

  const unsafeString = `Tool result with bad data: \uD800\uD801\uDC00end`;
  console.log(`Input has unpaired surrogates: ${hasUnpairedSurrogates(unsafeString)}`);

  const safeString = sanitizeUnicode(unsafeString);
  console.log(`After sanitize, unpaired: ${hasUnpairedSurrogates(safeString)}`);

  // Demonstrate that sanitized strings are safe to JSON.stringify
  try {
    const json = JSON.stringify({ content: safeString });
    JSON.parse(json); // Verify round-trip
    printEvent("SAFE", "Sanitized string round-trips through JSON successfully");
  } catch (err) {
    printEvent("ERROR", `JSON round-trip failed: ${(err as Error).message}`);
  }

  printSection("Key Insight");
  console.log("Always sanitize external data before sending to LLM APIs:");
  console.log("  1. Web scraping results may contain unpaired surrogates");
  console.log("  2. Database content from various encodings");
  console.log("  3. User input from copy-paste across platforms");
  console.log("  4. LinkedIn/social media data with emoji");
  console.log("\nsanitizeUnicode() replaces unpaired surrogates with U+FFFD,");
  console.log("ensuring the string is valid for JSON serialization.");
}

main().catch(console.error);
