import { hasOAuthConfig } from "./config.js";
import type { AppType, EnvMode, OpenIdConfiguration, ServerConfig } from "./types.js";

export function getIntegrationChecklist(appType: AppType): string {
  const appSpecificSteps: Record<AppType, string[]> = {
    generic: [
      "Create a CentralAuth integration in the dashboard and collect your organization ID and client secret.",
      "Use the OpenID Connect discovery URL at `https://centralauth.com/.well-known/openid-configuration`.",
      "Register a callback URL and whitelist your app domain.",
      "Implement the authorization code flow with PKCE and state validation.",
    ],
    nextjs: [
      "Install the official `centralauth` package in your Next.js app.",
      "Create a new `CentralAuthClass` instance per request.",
      "Set `callbackUrl` to something like `https://your-app.com/api/auth/callback`.",
      "Handle `login`, `callback`, `user`, and `logout` routes with the library methods.",
    ],
    express: [
      "Install the official `centralauth` package in your Node app.",
      "Use `CentralAuthHTTPClass` for HTTP servers like Express.",
      "Handle callback requests from the CentralAuth redirect using `callbackHTTP`.",
      "Keep client credentials on the server and never expose the secret to the browser.",
    ],
    "react-native": [
      "Register the native app bundle ID / package name in CentralAuth.",
      "Use `CentralAuthProvider` from `centralauth/native` for Expo / React Native flows.",
      "Configure an app link / universal link callback URL that matches the registration.",
      "Send the access token to your backend for userinfo and protected API calls.",
    ],
    desktop: [
      "Register a loopback callback URL and desktop app in the CentralAuth dashboard.",
      "Use an OAuth 2.0 library with PKCE and a local loopback server.",
      "Sign the app and register the certificate thumbprint if required.",
      "Exchange the callback `code` against `/api/v1/verify` if you are doing a manual integration.",
    ],
  };

  const commonSteps = [
    "Choose `https://centralauth.com`, your CentralAuth subdomain, or your verified custom domain as the auth base URL.",
    "Store secrets in environment variables, not in source control.",
    "Verify the returned OAuth `state` value on every callback.",
    "Handle CentralAuth errors by checking the returned `errorCode` and `message`.",
  ];

  return [
    `## ${labelForAppType(appType)} integration checklist`,
    "",
    ...numbered([...appSpecificSteps[appType], ...commonSteps]),
  ].join("\n");
}

export function explainCallbackSetup(appType: AppType, appBaseUrl?: string, callbackPath = defaultCallbackPath(appType)): string {
  const resolvedBaseUrl = appBaseUrl ?? defaultBaseUrl(appType);
  const callbackUrl = `${resolvedBaseUrl.replace(/\/$/, "")}${callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`}`;

  return [
    `## Callback setup for ${labelForAppType(appType)}`,
    "",
    `- Recommended callback URL: \`${callbackUrl}\``,
    "- CentralAuth will redirect back with `code` and `state` query parameters.",
    "- Always verify the returned `state` value to protect against CSRF.",
    "- The callback URL must match the URL configured in the CentralAuth dashboard.",
    "- The app domain must be registered as a whitelist domain on the organization.",
    "- If an error occurs during login, the callback can receive `error` and `error_description` instead.",
    "",
    "### CentralAuth-specific notes",
    "",
    "- For manual web/native flows, CentralAuth documents token exchange via `POST https://centralauth.com/api/v1/verify`.",
    "- When using the official Node library, the callback flow can be handled automatically.",
    "- For web apps, CentralAuth can validate IP and user-agent when retrieving user info.",
  ].join("\n");
}

export function validateEnvRequirements(config: ServerConfig, mode: EnvMode): string {
  const basicChecks = [
    statusLine("CENTRALAUTH_AUTH_BASE_URL", Boolean(config.authBaseUrl), "Optional; defaults to `https://centralauth.com`"),
  ];

  const oauthChecks = [
    statusLine("CENTRALAUTH_CLIENT_ID", Boolean(config.clientId), "Needed for a full OAuth integration in your app"),
    statusLine("CENTRALAUTH_CLIENT_SECRET", Boolean(config.clientSecret), "Needed for callback verification or manual token flows"),
    statusLine("CENTRALAUTH_CALLBACK_URL", Boolean(config.callbackUrl), "Must match the dashboard registration"),
  ];

  return [
    `## Environment validation (${mode})`,
    "",
    ...basicChecks,
    ...(mode === "oauth" ? ["", ...oauthChecks] : []),
    "",
    "No API key is required for this MCP server.",
    mode === "oauth"
      ? hasOAuthConfig(config)
        ? "OAuth-specific guidance is fully configured."
        : "OAuth-specific env vars are still incomplete for your application integration."
      : "Basic documentation and setup guidance are ready to use.",
  ].filter(Boolean).join("\n");
}

export function generateEnvTemplate(appType: AppType, appBaseUrl?: string): string {
  const callbackUrl = `${(appBaseUrl ?? defaultBaseUrl(appType)).replace(/\/$/, "")}${defaultCallbackPath(appType)}`;

  const lines = [
    "AUTH_BASE_URL=https://centralauth.com",
    "AUTH_ORGANIZATION_ID=your_organization_id",
    "AUTH_SECRET=your_client_secret",
    `AUTH_CALLBACK_URL=${callbackUrl}`,
  ];

  if (appType === "react-native") {
    lines.push("AUTH_APP_ID=com.example.app");
    lines.push("AUTH_DEVICE_ID=unique-device-id");
  }

  return [
    `## Example env template for ${labelForAppType(appType)}`,
    "",
    "```env",
    ...lines,
    "```",
    "",
    "> These values belong in the app you are integrating with CentralAuth, not in this MCP server.",
  ].join("\n");
}

export function generateIntegrationSnippet(appType: AppType): string {
  const snippetByAppType: Record<AppType, string> = {
    generic: "```ts\nimport { Issuer, generators } from 'openid-client';\n\nconst issuer = await Issuer.discover('https://centralauth.com/.well-known/openid-configuration');\nconst client = new issuer.Client({\n  client_id: process.env.AUTH_ORGANIZATION_ID!,\n  client_secret: process.env.AUTH_SECRET!,\n  redirect_uris: [process.env.AUTH_CALLBACK_URL!],\n  response_types: ['code'],\n});\n\nconst codeVerifier = generators.codeVerifier();\nconst codeChallenge = generators.codeChallenge(codeVerifier);\n```",
    nextjs: "```ts\nimport { CentralAuthClass } from 'centralauth/server';\n\nexport async function GET(req: Request, { params }: { params: Promise<{ action: 'login' | 'callback' | 'user' | 'logout' }> }) {\n  const { action } = await params;\n  const requestUrl = new URL(req.url);\n\n  const authClient = new CentralAuthClass({\n    clientId: process.env.AUTH_ORGANIZATION_ID!,\n    secret: process.env.AUTH_SECRET!,\n    authBaseUrl: process.env.AUTH_BASE_URL ?? 'https://centralauth.com',\n    callbackUrl: process.env.AUTH_CALLBACK_URL ?? `${requestUrl.origin}/api/auth/callback`,\n  });\n\n  if (action === 'login') return authClient.login(req);\n  if (action === 'callback') return authClient.callback(req);\n  if (action === 'user') return authClient.user(req.headers);\n  return authClient.logout(req);\n}\n```",
    express: "```ts\nimport express from 'express';\nimport { CentralAuthHTTPClass } from 'centralauth/server';\n\nconst app = express();\n\napp.get('/auth/:action', async (req, res) => {\n  const authClient = new CentralAuthHTTPClass({\n    clientId: process.env.AUTH_ORGANIZATION_ID!,\n    secret: process.env.AUTH_SECRET!,\n    authBaseUrl: process.env.AUTH_BASE_URL ?? 'https://centralauth.com',\n    callbackUrl: process.env.AUTH_CALLBACK_URL ?? 'https://your-app.example.com/auth/callback',\n  });\n\n  if (req.params.action === 'login') return authClient.loginHTTP(req, res);\n  if (req.params.action === 'callback') return authClient.callbackHTTP(req, res);\n  if (req.params.action === 'logout') return authClient.logoutHTTP(req, res);\n  return authClient.userHTTP(req, res);\n});\n```",
    "react-native": "```tsx\nimport { CentralAuthProvider } from 'centralauth/native';\n\nexport default function RootLayout() {\n  return (\n    <CentralAuthProvider\n      clientId={process.env.EXPO_PUBLIC_AUTH_ORGANIZATION_ID!}\n      appId={process.env.EXPO_PUBLIC_AUTH_APP_ID!}\n      deviceId={process.env.EXPO_PUBLIC_AUTH_DEVICE_ID!}\n      authBaseUrl={process.env.EXPO_PUBLIC_AUTH_BASE_URL ?? 'https://centralauth.com'}\n      callbackUrl={process.env.EXPO_PUBLIC_AUTH_CALLBACK_URL!}\n    >\n      {/* app routes */}\n    </CentralAuthProvider>\n  );\n}\n```",
    desktop: "```ts\n// Use a desktop OAuth library with PKCE and a local loopback callback server.\nconst authBaseUrl = 'https://centralauth.com';\nconst callbackUrl = 'http://127.0.0.1:3000/callback';\n// Exchange the returned `code` via the documented verify flow if needed.\n```",
  };

  return [
    `## ${labelForAppType(appType)} starter snippet`,
    "",
    snippetByAppType[appType],
    "",
    "> Adjust variable names and routes to match your app structure.",
  ].join("\n");
}

export function generateStarterFiles(appType: AppType, appBaseUrl?: string): string {
  const resolvedBaseUrl = (appBaseUrl ?? defaultBaseUrl(appType)).replace(/\/$/, "");
  const nextjsCallbackUrl = `${resolvedBaseUrl}/api/auth/callback`;
  const expressCallbackUrl = `${resolvedBaseUrl}/auth/callback`;

  if (appType === "nextjs") {
    return [
      "## Next.js starter files",
      "",
      "Install dependencies:",
      "```bash",
      "npm install centralauth",
      "```",
      "",
      "### `.env.local.example`",
      "```env",
      "AUTH_BASE_URL=https://centralauth.com",
      "AUTH_ORGANIZATION_ID=your_organization_id",
      "AUTH_SECRET=your_client_secret",
      `AUTH_CALLBACK_URL=${nextjsCallbackUrl}`,
      "```",
      "",
      "### `app/api/auth/[action]/route.ts`",
      "```ts",
      "import { CentralAuthClass } from 'centralauth/server';",
      "",
      "export async function GET(",
      "  req: Request,",
      "  { params }: { params: Promise<{ action: 'login' | 'callback' | 'user' | 'logout' }> },",
      ") {",
      "  const { action } = await params;",
      "  const requestUrl = new URL(req.url);",
      "",
      "  const authClient = new CentralAuthClass({",
      "    clientId: process.env.AUTH_ORGANIZATION_ID!,",
      "    secret: process.env.AUTH_SECRET!,",
      "    authBaseUrl: process.env.AUTH_BASE_URL ?? 'https://centralauth.com',",
      "    callbackUrl: process.env.AUTH_CALLBACK_URL ?? `${requestUrl.origin}/api/auth/callback`,",
      "  });",
      "",
      "  if (action === 'login') return authClient.login(req);",
      "  if (action === 'callback') return authClient.callback(req);",
      "  if (action === 'user') return authClient.user(req.headers);",
      "  return authClient.logout(req);",
      "}",
      "```",
      "",
      "### `app/login/page.tsx`",
      "```tsx",
      "export default function LoginPage() {",
      "  return (",
      "    <main style={{ padding: 24 }}>",
      "      <h1>Sign in</h1>",
      "      <p>Use CentralAuth to sign into your app.</p>",
      "      <a href='/api/auth/login'>Continue with CentralAuth</a>",
      "    </main>",
      "  );",
      "}",
      "```",
    ].join("\n");
  }

  if (appType === "express") {
    return [
      "## Express starter files",
      "",
      "Install dependencies:",
      "```bash",
      "npm install express centralauth dotenv",
      "npm install -D @types/express typescript tsx",
      "```",
      "",
      "### `.env.example`",
      "```env",
      "PORT=3000",
      "AUTH_BASE_URL=https://centralauth.com",
      "AUTH_ORGANIZATION_ID=your_organization_id",
      "AUTH_SECRET=your_client_secret",
      `AUTH_CALLBACK_URL=${expressCallbackUrl}`,
      "```",
      "",
      "### `src/routes/auth.ts`",
      "```ts",
      "import { Router } from 'express';",
      "import { CentralAuthHTTPClass } from 'centralauth/server';",
      "",
      "const router = Router();",
      "",
      "router.get('/:action', async (req, res) => {",
      "  const authClient = new CentralAuthHTTPClass({",
      "    clientId: process.env.AUTH_ORGANIZATION_ID!,",
      "    secret: process.env.AUTH_SECRET!,",
      "    authBaseUrl: process.env.AUTH_BASE_URL ?? 'https://centralauth.com',",
      "    callbackUrl: process.env.AUTH_CALLBACK_URL ?? 'http://localhost:3000/auth/callback',",
      "  });",
      "",
      "  if (req.params.action === 'login') return authClient.loginHTTP(req, res);",
      "  if (req.params.action === 'callback') return authClient.callbackHTTP(req, res);",
      "  if (req.params.action === 'logout') return authClient.logoutHTTP(req, res);",
      "  return authClient.userHTTP(req, res);",
      "});",
      "",
      "export default router;",
      "```",
      "",
      "### `src/server.ts`",
      "```ts",
      "import 'dotenv/config';",
      "import express from 'express';",
      "import authRoutes from './routes/auth.js';",
      "",
      "const app = express();",
      "const port = Number(process.env.PORT ?? 3000);",
      "",
      "app.use('/auth', authRoutes);",
      "",
      "app.get('/', (_req, res) => {",
      "  res.send(`<a href='/auth/login'>Login with CentralAuth</a>`);",
      "});",
      "",
      "app.listen(port, () => {",
      "  console.log(`Server running on http://localhost:${port}`);",
      "});",
      "```",
    ].join("\n");
  }

  return [
    `## ${labelForAppType(appType)} starter files`,
    "",
    generateEnvTemplate(appType, appBaseUrl),
    "",
    generateIntegrationSnippet(appType),
    "",
    "> Full multi-file generators are currently optimized for `nextjs` and `express`.",
  ].join("\n");
}

export function summarizeOpenIdConfiguration(oidc: OpenIdConfiguration): string {
  return [
    "## OpenID configuration",
    "",
    `- Issuer: \`${oidc.issuer}\``,
    `- Authorization endpoint: \`${oidc.authorization_endpoint}\``,
    `- Token endpoint: \`${oidc.token_endpoint}\``,
    oidc.userinfo_endpoint ? `- Userinfo endpoint: \`${oidc.userinfo_endpoint}\`` : undefined,
    oidc.jwks_uri ? `- JWKS URI: \`${oidc.jwks_uri}\`` : undefined,
    oidc.scopes_supported?.length ? `- Supported scopes: ${oidc.scopes_supported.join(", ")}` : undefined,
    oidc.code_challenge_methods_supported?.length
      ? `- PKCE methods: ${oidc.code_challenge_methods_supported.join(", ")}`
      : undefined,
  ].filter(Boolean).join("\n");
}

export const DEVELOPER_OVERVIEW_MARKDOWN = `# CentralAuth developer overview\n\nThis MCP server is built around the CentralAuth developer docs. Use it to:\n\n- explain how to integrate CentralAuth in a project\n- validate callback, domain, and environment setup\n- generate starter env templates and code snippets\n\nKey documented endpoints:\n\n- OpenID discovery: \`https://centralauth.com/.well-known/openid-configuration\`\n- Verify endpoint: \`https://centralauth.com/api/v1/verify\`\n- Userinfo endpoint: \`https://centralauth.com/api/v1/userinfo\`\n`;

export const SECURITY_GUIDE_MARKDOWN = `# CentralAuth security and troubleshooting\n\n- Verify the OAuth \`state\` on callback to prevent CSRF.\n- Keep the client secret on the server only.\n- Use whitelist domains and make sure the callback URL matches the dashboard configuration.\n- Expect CentralAuth auth errors in the form \`{ errorCode, message }\`.\n- Prefer PKCE for web, mobile, and desktop clients.\n`;

function numbered(items: string[]): string[] {
  return items.map((item, index) => `${index + 1}. ${item}`);
}

function labelForAppType(appType: AppType): string {
  switch (appType) {
    case "nextjs":
      return "Next.js";
    case "express":
      return "Express";
    case "react-native":
      return "React Native";
    case "desktop":
      return "desktop";
    default:
      return "generic OAuth";
  }
}

function statusLine(name: string, ok: boolean, note: string): string {
  return `- ${ok ? "✅" : "❌"} ${name}: ${note}`;
}

function defaultCallbackPath(appType: AppType): string {
  switch (appType) {
    case "react-native":
      return "/auth/callback";
    case "desktop":
      return "/callback";
    default:
      return "/api/auth/callback";
  }
}

function defaultBaseUrl(appType: AppType): string {
  return appType === "desktop" ? "http://127.0.0.1:3000" : "https://your-app.example.com";
}
