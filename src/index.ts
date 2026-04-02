#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { CentralAuthApiError, CentralAuthClient } from "./centralauth.js";
import { loadConfig } from "./config.js";
import {
  explainCallbackSetup,
  generateEnvTemplate,
  generateIntegrationSnippet,
  generateStarterFiles,
  getIntegrationChecklist,
  summarizeOpenIdConfiguration,
  validateEnvRequirements,
} from "./docs.js";

const appTypeSchema = z.enum(["generic", "nextjs", "express", "react-native", "desktop"]);
const envModeSchema = z.enum(["basic", "oauth"]);

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new CentralAuthClient(config);

  const server = new McpServer({
    name: "centralauth-mcp-server",
    version: "0.2.0",
  });

  server.registerTool(
    "get_integration_checklist",
    {
      title: "Get CentralAuth integration checklist",
      description: "Explain the recommended CentralAuth setup for a given app type.",
      inputSchema: {
        appType: appTypeSchema.default("generic"),
      },
    },
    async ({ appType }) => textResult(getIntegrationChecklist(appType)),
  );

  server.registerTool(
    "explain_callback_setup",
    {
      title: "Explain callback setup",
      description: "Describe the callback URL and state/code handling required by CentralAuth.",
      inputSchema: {
        appType: appTypeSchema.default("generic"),
        appBaseUrl: z.string().url().optional(),
        callbackPath: z.string().min(1).optional(),
      },
    },
    async ({ appType, appBaseUrl, callbackPath }) =>
      textResult(explainCallbackSetup(appType, appBaseUrl, callbackPath)),
  );

  server.registerTool(
    "validate_env_requirements",
    {
      title: "Validate environment requirements",
      description: "Check which CentralAuth environment variables matter for basic or OAuth integration guidance.",
      inputSchema: {
        mode: envModeSchema.default("basic"),
      },
    },
    async ({ mode }) => textResult(validateEnvRequirements(config, mode)),
  );

  server.registerTool(
    "generate_env_template",
    {
      title: "Generate env template",
      description: "Generate a starter `.env` template for an app integrating with CentralAuth.",
      inputSchema: {
        appType: appTypeSchema.default("generic"),
        appBaseUrl: z.string().url().optional(),
      },
    },
    async ({ appType, appBaseUrl }) => textResult(generateEnvTemplate(appType, appBaseUrl)),
  );

  server.registerTool(
    "generate_integration_snippet",
    {
      title: "Generate integration snippet",
      description: "Generate a starter code snippet for CentralAuth integration in a chosen framework.",
      inputSchema: {
        appType: appTypeSchema.default("generic"),
      },
    },
    async ({ appType }) => textResult(generateIntegrationSnippet(appType)),
  );

  server.registerTool(
    "generate_starter_files",
    {
      title: "Generate starter files",
      description: "Generate a ready-to-copy starter file bundle for Next.js or Express CentralAuth integration.",
      inputSchema: {
        appType: appTypeSchema.default("nextjs"),
        appBaseUrl: z.string().url().optional(),
      },
    },
    async ({ appType, appBaseUrl }) => textResult(generateStarterFiles(appType, appBaseUrl)),
  );

  server.registerTool(
    "get_openid_configuration",
    {
      title: "Get OpenID configuration",
      description: "Fetch the public OpenID Connect discovery document for CentralAuth or a custom auth domain.",
      inputSchema: {
        authBaseUrl: z.string().url().optional(),
      },
    },
    async ({ authBaseUrl }) =>
      execute(async () => {
        const oidc = await client.getOpenIdConfiguration(authBaseUrl);
        return textResult(`${summarizeOpenIdConfiguration(oidc)}\n\n${renderJson(oidc)}`);
      }),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("CentralAuth MCP server is running over stdio.");
}

type ToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function textResult(text: string): ToolResponse {
  return {
    content: [{ type: "text" as const, text }],
  };
}

function renderJson(value: unknown): string {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

async function execute(factory: () => Promise<ToolResponse>): Promise<ToolResponse> {
  try {
    return await factory();
  } catch (error) {
    return toToolError(error);
  }
}

function toToolError(error: unknown): ToolResponse {
  if (error instanceof CentralAuthApiError) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: [
            `CentralAuth request failed with status ${error.status}.`,
            error.errorCode ? `Error code: ${error.errorCode}` : undefined,
            `Message: ${error.message}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  }

  const message = error instanceof Error ? error.message : "Unknown error";

  return {
    isError: true,
    content: [{ type: "text" as const, text: `Unexpected error: ${message}` }],
  };
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
