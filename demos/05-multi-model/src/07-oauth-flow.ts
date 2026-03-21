/**
 * Demo 05-07: Simplified PKCE OAuth Demonstration
 *
 * PKCE (Proof Key for Code Exchange) is used for secure OAuth in
 * CLI and mobile apps where a client secret can't be safely stored.
 *
 * This demo shows the cryptographic foundation — no actual OAuth
 * server needed.
 */

import { createHash, randomBytes } from "node:crypto";
import { printSection, printEvent } from "@pi-tutorial/shared";

// ── PKCE generation ─────────────────────────────────────────────────

/**
 * Generate a cryptographically random code verifier.
 * Must be 43-128 characters, using [A-Z, a-z, 0-9, -, ., _, ~].
 */
export function generateCodeVerifier(length: number = 64): string {
  // Generate random bytes and encode as base64url
  const buffer = randomBytes(length);
  return base64UrlEncode(buffer).slice(0, length);
}

/**
 * Generate a code challenge from a verifier using SHA-256.
 * challenge = base64url(sha256(verifier))
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}

/**
 * Base64url encoding (RFC 7636):
 * Standard base64, but replace + with -, / with _, and remove = padding.
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ── OAuth flow steps ────────────────────────────────────────────────

interface OAuthConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

function buildAuthorizationUrl(
  config: OAuthConfig,
  codeChallenge: string,
  state: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

function buildTokenExchangeRequest(
  config: OAuthConfig,
  authorizationCode: string,
  codeVerifier: string,
): { url: string; method: string; headers: Record<string, string>; body: string } {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: codeVerifier,
  });

  return {
    url: config.tokenEndpoint,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  printSection("Demo 05-07: PKCE OAuth Flow (Crypto Demo)");

  console.log("PKCE = Proof Key for Code Exchange");
  console.log("Used for: CLI apps, mobile apps, SPAs (no client secret needed)\n");

  // Step 1: Generate PKCE pair
  printSection("Step 1: Generate PKCE Challenge Pair");

  const codeVerifier = generateCodeVerifier(64);
  const codeChallenge = generateCodeChallenge(codeVerifier);

  console.log(`Code Verifier  (secret, kept by client):`);
  console.log(`  ${codeVerifier}`);
  console.log(`  Length: ${codeVerifier.length} chars\n`);

  console.log(`Code Challenge (sent to auth server):`);
  console.log(`  ${codeChallenge}`);
  console.log(`  Method: S256 (SHA-256 + base64url)\n`);

  // Verify the relationship
  const verifyChallenge = generateCodeChallenge(codeVerifier);
  printEvent("VERIFY", `sha256(verifier) === challenge: ${verifyChallenge === codeChallenge}`);

  // Step 2: Build authorization URL
  printSection("Step 2: Authorization URL");

  const config: OAuthConfig = {
    authorizationEndpoint: "https://auth.example.com/authorize",
    tokenEndpoint: "https://auth.example.com/token",
    clientId: "cli-app-12345",
    redirectUri: "http://localhost:8765/callback",
    scope: "read write",
  };

  const state = randomBytes(16).toString("hex");
  const authUrl = buildAuthorizationUrl(config, codeChallenge, state);

  console.log("The CLI would open this URL in the user's browser:\n");
  console.log(`  ${authUrl}\n`);

  console.log("Key parameters:");
  console.log(`  code_challenge:        ${codeChallenge.slice(0, 20)}...`);
  console.log(`  code_challenge_method: S256`);
  console.log(`  state:                 ${state}`);
  console.log(`  redirect_uri:          ${config.redirectUri}`);

  // Step 3: Token exchange
  printSection("Step 3: Token Exchange Request");

  console.log("After user approves, auth server redirects with an authorization code.");
  console.log("The CLI exchanges it for tokens, proving it has the verifier:\n");

  const mockAuthCode = "auth_code_" + randomBytes(16).toString("hex");
  const tokenRequest = buildTokenExchangeRequest(config, mockAuthCode, codeVerifier);

  console.log(`${tokenRequest.method} ${tokenRequest.url}`);
  console.log(`Content-Type: ${tokenRequest.headers["Content-Type"]}\n`);

  // Parse and display body params
  const bodyParams = new URLSearchParams(tokenRequest.body);
  console.log("Body parameters:");
  for (const [key, value] of bodyParams.entries()) {
    const display = value.length > 40 ? value.slice(0, 40) + "..." : value;
    console.log(`  ${key.padEnd(15)} = ${display}`);
  }

  // Step 4: How the server verifies
  printSection("Step 4: Server Verification (Conceptual)");

  console.log("The auth server verifies PKCE by:");
  console.log("  1. Takes the code_verifier from the token request");
  console.log("  2. Computes sha256(code_verifier)");
  console.log("  3. Compares with the code_challenge from step 2");
  console.log("  4. If they match → the same client that started the flow is finishing it\n");

  const serverSideChallenge = generateCodeChallenge(codeVerifier);
  console.log(`Server computes: sha256("${codeVerifier.slice(0, 20)}...")`);
  console.log(`Server gets:     ${serverSideChallenge}`);
  console.log(`Original was:    ${codeChallenge}`);
  console.log(`Match:           ${serverSideChallenge === codeChallenge}`);

  printEvent("SECURE", "PKCE prevents authorization code interception attacks");

  // Step 5: What the token response looks like
  printSection("Step 5: Token Response (Mock)");

  const mockTokenResponse = {
    access_token: "eyJ" + randomBytes(32).toString("base64url"),
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "rt_" + randomBytes(24).toString("base64url"),
    scope: config.scope,
  };

  console.log("Response from auth server:");
  console.log(JSON.stringify(mockTokenResponse, null, 2));

  printSection("Key Insight");
  console.log("PKCE OAuth flow for CLI/desktop apps:");
  console.log("  1. Generate random verifier (secret)");
  console.log("  2. Send sha256(verifier) as challenge to auth server");
  console.log("  3. User approves in browser → receives auth code");
  console.log("  4. Exchange auth code + original verifier for tokens");
  console.log("  5. Server verifies sha256(verifier) === stored challenge");
  console.log("\nNo client secret needed — the PKCE pair proves identity.");
}

main().catch(console.error);
