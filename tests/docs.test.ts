import assert from "node:assert/strict";
import test from "node:test";

import {
  explainCallbackSetup,
  generateEnvTemplate,
  generateIntegrationSnippet,
  generateStarterFiles,
  getIntegrationChecklist,
  summarizeOpenIdConfiguration,
  validateEnvRequirements,
} from "../src/docs.js";
import type { OpenIdConfiguration, ServerConfig } from "../src/types.js";

test("getIntegrationChecklist mentions CentralAuth setup", () => {
  const text = getIntegrationChecklist("nextjs");

  assert.match(text, /CentralAuth/i);
  assert.match(text, /callback/i);
  assert.match(text, /Next\.js/i);
});

test("explainCallbackSetup includes code and state", () => {
  const text = explainCallbackSetup("express", "https://example.com", "/auth/callback");

  assert.match(text, /code/);
  assert.match(text, /state/);
  assert.match(text, /https:\/\/example\.com\/auth\/callback/);
});

test("validateEnvRequirements reports no API key required", () => {
  const config: ServerConfig = {
    authBaseUrl: "https://centralauth.com",
    timeoutMs: 15000,
  };

  const text = validateEnvRequirements(config, "basic");
  assert.doesNotMatch(text, /CENTRALAUTH_API_KEY/);
  assert.match(text, /No API key is required/i);
});

test("generateEnvTemplate returns starter variables", () => {
  const text = generateEnvTemplate("nextjs", "https://example.com");

  assert.match(text, /AUTH_BASE_URL=/);
  assert.match(text, /AUTH_ORGANIZATION_ID=/);
  assert.match(text, /AUTH_CALLBACK_URL=https:\/\/example\.com\/api\/auth\/callback/);
});

test("generateIntegrationSnippet returns framework code", () => {
  const text = generateIntegrationSnippet("express");

  assert.match(text, /CentralAuthHTTPClass/);
  assert.match(text, /\/auth\/:action/);
});

test("generateStarterFiles returns Next.js starter files", () => {
  const text = generateStarterFiles("nextjs", "https://example.com");

  assert.match(text, /app\/api\/auth\/\[action\]\/route\.ts/);
  assert.match(text, /app\/login\/page\.tsx/);
  assert.match(text, /AUTH_CALLBACK_URL=https:\/\/example\.com\/api\/auth\/callback/);
});

test("generateStarterFiles returns Express starter files", () => {
  const text = generateStarterFiles("express", "https://example.com");

  assert.match(text, /src\/routes\/auth\.ts/);
  assert.match(text, /src\/server\.ts/);
  assert.match(text, /CentralAuthHTTPClass/);
});

test("summarizeOpenIdConfiguration includes important endpoints", () => {
  const oidc: OpenIdConfiguration = {
    issuer: "https://centralauth.com",
    authorization_endpoint: "https://centralauth.com/oauth/authorize",
    token_endpoint: "https://centralauth.com/oauth/token",
    userinfo_endpoint: "https://centralauth.com/api/v1/userinfo",
    scopes_supported: ["openid", "profile", "email"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
  };

  const text = summarizeOpenIdConfiguration(oidc);
  assert.match(text, /authorization endpoint/i);
  assert.match(text, /userinfo endpoint/i);
  assert.match(text, /openid, profile, email/i);
});
