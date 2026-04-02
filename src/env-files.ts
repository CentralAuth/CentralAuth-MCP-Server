import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AppType } from "./types.js";

export interface EnvWriteResult {
  filePath: string;
  created: boolean;
  updatedKeys: string[];
}

export async function upsertEnvFile(filePath: string, values: Record<string, string>): Promise<EnvWriteResult> {
  const resolvedPath = path.resolve(filePath);
  const entries = Object.entries(values).filter(([, value]) => value !== undefined && value !== "");

  await mkdir(path.dirname(resolvedPath), { recursive: true });

  let existingContent = "";
  let created = false;

  try {
    existingContent = await readFile(resolvedPath, "utf8");
  } catch (error: unknown) {
    const code = error instanceof Error && "code" in error ? String((error as NodeJS.ErrnoException).code) : undefined;
    if (code !== "ENOENT") {
      throw error;
    }
    created = true;
  }

  const lines = existingContent.length > 0 ? existingContent.split(/\r?\n/) : [];
  const seen = new Set<string>();

  const updatedLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) {
      return line;
    }

    const key = match[1];
    const replacement = entries.find(([entryKey]) => entryKey === key);
    if (!replacement) {
      return line;
    }

    seen.add(key);
    return `${key}=${replacement[1]}`;
  });

  const missingEntries = entries.filter(([key]) => !seen.has(key));

  if (missingEntries.length > 0) {
    if (updatedLines.length > 0 && updatedLines[updatedLines.length - 1] !== "") {
      updatedLines.push("");
    }

    if (!updatedLines.includes("# CentralAuth")) {
      updatedLines.push("# CentralAuth");
    }

    for (const [key, value] of missingEntries) {
      updatedLines.push(`${key}=${value}`);
    }
  }

  const finalContent = `${updatedLines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "")}`.replace(/\n?$/, "\n");
  await writeFile(resolvedPath, finalContent, "utf8");

  return {
    filePath: resolvedPath,
    created,
    updatedKeys: entries.map(([key]) => key),
  };
}

export function defaultEnvFileName(appType: AppType): string {
  return appType === "nextjs" ? ".env.local" : ".env";
}

export async function detectAppType(targetProjectPath: string): Promise<AppType> {
  const resolvedPath = path.resolve(targetProjectPath);

  if (await pathExists(path.join(resolvedPath, "next.config.js")) || await pathExists(path.join(resolvedPath, "next.config.mjs"))) {
    return "nextjs";
  }

  if (await pathExists(path.join(resolvedPath, "app.json")) || await pathExists(path.join(resolvedPath, "expo-env.d.ts"))) {
    return "react-native";
  }

  if (await pathExists(path.join(resolvedPath, "package.json"))) {
    try {
      const packageJson = JSON.parse(await readFile(path.join(resolvedPath, "package.json"), "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      const deps = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) };
      if ("next" in deps) {
        return "nextjs";
      }
      if ("express" in deps) {
        return "express";
      }
      if ("expo" in deps || "react-native" in deps) {
        return "react-native";
      }
    } catch {
      // fall through to generic detection
    }
  }

  return "generic";
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}
