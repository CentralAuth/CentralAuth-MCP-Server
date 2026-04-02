#!/usr/bin/env node

import path from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { CentralAuthApiError, CentralAuthClient } from "./centralauth.js";
import { loadConfig } from "./config.js";
import {
  buildProjectEnvValues,
  deriveOrganizationSetup,
  draftOrganizationFromPrompt,
  explainCallbackSetup,
  generateEnvTemplate,
  generateIntegrationSnippet,
  generateProjectEnv,
  generateStarterFiles,
  getIntegrationChecklist,
  summarizeOpenIdConfiguration,
  validateEnvRequirements,
} from "./docs.js";
import { defaultEnvFileName, detectAppType, upsertEnvFile } from "./env-files.js";

const appTypeSchema = z.enum(["generic", "nextjs", "express", "react-native", "desktop"]);
const envModeSchema = z.enum(["basic", "oauth", "admin"]);

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new CentralAuthClient(config);

  const server = new McpServer({
    name: "centralauth-mcp-server",
    version: "0.4.0",
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
    "draft_organization_from_prompt",
    {
      title: "Draft organization from prompt",
      description: "Turn a freeform product prompt into a suggested CentralAuth organization setup and env block.",
      inputSchema: {
        prompt: z.string().min(3),
        appType: appTypeSchema.default("nextjs"),
        appBaseUrl: z.string().url().optional(),
      },
    },
    async ({ prompt, appType, appBaseUrl }) => textResult(draftOrganizationFromPrompt(prompt, appType, appBaseUrl)),
  );

  server.registerTool(
    "generate_project_env",
    {
      title: "Generate project env",
      description: "Generate ready-to-paste project environment variables from an organization ID and optional secret.",
      inputSchema: {
        appType: appTypeSchema.default("nextjs"),
        organizationId: z.string().min(1),
        clientSecret: z.string().min(1).optional(),
        appBaseUrl: z.string().url().optional(),
        authBaseUrl: z.string().url().optional(),
      },
    },
    async ({ appType, organizationId, clientSecret, appBaseUrl, authBaseUrl }) =>
      textResult(generateProjectEnv(appType, organizationId, clientSecret, appBaseUrl, authBaseUrl)),
  );

  server.registerTool(
    "write_project_env_file",
    {
      title: "Write project env file",
      description: "Write or update CentralAuth variables in a target project's `.env` file.",
      inputSchema: {
        appType: appTypeSchema.optional(),
        organizationId: z.string().min(1),
        clientSecret: z.string().min(1).optional(),
        appBaseUrl: z.string().url().optional(),
        authBaseUrl: z.string().url().optional(),
        targetProjectPath: z.string().min(1).optional(),
        targetEnvPath: z.string().min(1).optional(),
      },
    },
    async ({ appType, organizationId, clientSecret, appBaseUrl, authBaseUrl, targetProjectPath, targetEnvPath }) =>
      execute(async () => {
        const resolvedAppType = appType ?? await detectAppType(targetProjectPath ?? process.cwd());
        const values = buildProjectEnvValues(resolvedAppType, organizationId, clientSecret, appBaseUrl, authBaseUrl);
        const filePath = resolveTargetEnvPath(resolvedAppType, targetProjectPath, targetEnvPath);
        const writeResult = await upsertEnvFile(filePath, values);

        return textResult(
          [
            `## Project env file updated`,
            `- Detected app type: ${resolvedAppType}`,
            `- File: \`${writeResult.filePath}\``,
            `- Created new file: ${String(writeResult.created)}`,
            `- Updated keys: ${writeResult.updatedKeys.join(", ")}`,
            "",
            generateProjectEnv(resolvedAppType, organizationId, clientSecret, appBaseUrl, authBaseUrl),
          ].join("\n"),
        );
      }),
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
    "create_organization_from_prompt",
    {
      title: "Create organization from prompt",
      description: "Create a new CentralAuth organization from a freeform prompt and return a ready-to-paste env block. Requires admin mode.",
      inputSchema: {
        tenantId: z.string().uuid(),
        prompt: z.string().min(3),
        appType: appTypeSchema.default("nextjs"),
        appBaseUrl: z.string().url().optional(),
        enableUserCreation: z.boolean().optional(),
        targetProjectPath: z.string().min(1).optional(),
        targetEnvPath: z.string().min(1).optional(),
      },
    },
    async ({ tenantId, prompt, appType, appBaseUrl, enableUserCreation, targetProjectPath, targetEnvPath }) =>
      execute(async () => {
        const draft = deriveOrganizationSetup(prompt, appType, appBaseUrl);
        const organization = await client.createOrganization({
          tenantId,
          name: draft.name,
          customDomain: draft.customDomain,
          overrideParentSettings: true,
          settings: {
            allowLocalhost: draft.allowLocalhost,
            enableUserCreation,
          },
        });

        const envValues = buildProjectEnvValues(appType, organization.id, organization.clientSecret, appBaseUrl, config.authBaseUrl);
        const envWriteMessage = targetProjectPath || targetEnvPath
          ? await writeEnvValuesToProject(appType, envValues, targetProjectPath, targetEnvPath)
          : undefined;

        return textResult(
          [
            `## CentralAuth organization created`,
            `- Name: ${organization.name}`,
            `- Organization ID: \`${organization.id}\``,
            organization.customDomain ? `- Custom domain: \`${organization.customDomain}\`` : undefined,
            organization.clientSecret ? "- A new client secret was returned and included below." : "- No client secret was returned; update the env block with the correct secret from CentralAuth.",
            envWriteMessage,
            "",
            generateProjectEnv(appType, organization.id, organization.clientSecret, appBaseUrl, config.authBaseUrl),
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }),
  );

  server.registerTool(
    "rotate_organization_secret",
    {
      title: "Rotate organization secret",
      description: "Rotate the secret of an existing CentralAuth organization and return an updated env block. Requires admin mode.",
      inputSchema: {
        organizationId: z.string().uuid(),
        appType: appTypeSchema.default("nextjs"),
        appBaseUrl: z.string().url().optional(),
        activateImmediately: z.boolean().default(false),
        targetProjectPath: z.string().min(1).optional(),
        targetEnvPath: z.string().min(1).optional(),
      },
    },
    async ({ organizationId, appType, appBaseUrl, activateImmediately, targetProjectPath, targetEnvPath }) =>
      execute(async () => {
        const newSecret = await client.rotateOrganizationSecret(organizationId);

        if (activateImmediately) {
          await client.activateOrganizationSecret(organizationId, newSecret);
        }

        const envValues = buildProjectEnvValues(appType, organizationId, newSecret, appBaseUrl, config.authBaseUrl);
        const envWriteMessage = targetProjectPath || targetEnvPath
          ? await writeEnvValuesToProject(appType, envValues, targetProjectPath, targetEnvPath)
          : undefined;

        return textResult(
          [
            `## CentralAuth secret rotated`,
            `- Organization ID: \`${organizationId}\``,
            activateImmediately
              ? "- The new secret was activated immediately."
              : "- The new secret was created but not auto-activated; activate it when you are ready to switch your project over.",
            envWriteMessage,
            "",
            generateProjectEnv(appType, organizationId, newSecret, appBaseUrl, config.authBaseUrl),
          ].filter(Boolean).join("\n"),
        );
      }),
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

async function writeEnvValuesToProject(
  appType: z.infer<typeof appTypeSchema>,
  values: Record<string, string>,
  targetProjectPath?: string,
  targetEnvPath?: string,
): Promise<string> {
  const filePath = resolveTargetEnvPath(appType, targetProjectPath, targetEnvPath);
  const result = await upsertEnvFile(filePath, values);
  return `- Updated env file: \`${result.filePath}\``;
}

function resolveTargetEnvPath(
  appType: z.infer<typeof appTypeSchema>,
  targetProjectPath?: string,
  targetEnvPath?: string,
): string {
  if (targetEnvPath) {
    return targetEnvPath;
  }

  const basePath = targetProjectPath ? path.resolve(targetProjectPath) : process.cwd();
  return path.join(basePath, defaultEnvFileName(appType));
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
