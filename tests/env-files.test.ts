import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { defaultEnvFileName, detectAppType, upsertEnvFile } from "../src/env-files.js";

test("defaultEnvFileName uses .env.local for Next.js", () => {
  assert.equal(defaultEnvFileName("nextjs"), ".env.local");
  assert.equal(defaultEnvFileName("express"), ".env");
});

test("detectAppType identifies a Next.js project from package.json", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "centralauth-mcp-"));

  try {
    await writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({ dependencies: { next: "15.0.0" } }, null, 2),
      "utf8",
    );

    const appType = await detectAppType(tempDir);
    assert.equal(appType, "nextjs");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("upsertEnvFile creates a new env file with CentralAuth values", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "centralauth-mcp-"));
  const envPath = path.join(tempDir, ".env.local");

  try {
    const result = await upsertEnvFile(envPath, {
      AUTH_BASE_URL: "https://centralauth.com",
      AUTH_ORGANIZATION_ID: "org_123",
      AUTH_SECRET: "secret_abc",
      AUTH_CALLBACK_URL: "https://example.com/api/auth/callback",
    });

    const fileContent = await readFile(envPath, "utf8");

    assert.equal(result.created, true);
    assert.match(fileContent, /# CentralAuth/);
    assert.match(fileContent, /AUTH_ORGANIZATION_ID=org_123/);
    assert.match(fileContent, /AUTH_SECRET=secret_abc/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("upsertEnvFile updates existing values and preserves unrelated entries", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "centralauth-mcp-"));
  const envPath = path.join(tempDir, ".env");

  try {
    await writeFile(
      envPath,
      [
        "EXISTING_VAR=keep-me",
        "AUTH_ORGANIZATION_ID=old_org",
        "AUTH_SECRET=old_secret",
        "",
      ].join("\n"),
      "utf8",
    );

    await upsertEnvFile(envPath, {
      AUTH_ORGANIZATION_ID: "new_org",
      AUTH_SECRET: "new_secret",
      AUTH_CALLBACK_URL: "https://example.com/auth/callback",
    });

    const fileContent = await readFile(envPath, "utf8");

    assert.match(fileContent, /EXISTING_VAR=keep-me/);
    assert.match(fileContent, /AUTH_ORGANIZATION_ID=new_org/);
    assert.match(fileContent, /AUTH_SECRET=new_secret/);
    assert.match(fileContent, /AUTH_CALLBACK_URL=https:\/\/example.com\/auth\/callback/);
    assert.doesNotMatch(fileContent, /old_org/);
    assert.doesNotMatch(fileContent, /old_secret/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
