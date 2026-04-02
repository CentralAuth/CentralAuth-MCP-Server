# CentralAuth MCP Server

A Model Context Protocol (MCP) server that helps AI tools integrate **CentralAuth** into applications using the public developer documentation and OpenID discovery endpoint.

## Features

- Integration guidance for `Next.js`, `Express`, generic OAuth 2.0 apps, React Native, and desktop apps
- Callback URL, whitelist-domain, and PKCE guidance
- Public OpenID Connect discovery helper
- Starter `.env` templates for app integrations
- Starter framework code snippets
- Full ready-to-copy starter file bundles for `Next.js` and `Express`
- Project env writing support that can update `.env` / `.env.local` files directly
- Optional admin-mode organization creation and secret rotation

## Requirements

- Node.js 18+
- **No CentralAuth API key is required**

## Setup

```bash
npm install
npm run build
```

## Run

```bash
npm run dev
# or
npm start
```

## Project auto-detection

When using `write_project_env_file`, the server can infer the app type from a target project path.

Examples:
- `Next.js` → prefers `.env.local`
- `Express` / generic Node apps → prefers `.env`
- `React Native` / Expo → uses `.env`

You can still override the app type explicitly if needed.

## What this MCP server can do

This server is designed to help AI assistants do more than just explain OAuth concepts. It can help with the whole CentralAuth setup flow:

1. **Understand your app**
   - explain how CentralAuth fits into `Next.js`, `Express`, `React Native`, or a generic OAuth app
   - explain callback URLs, whitelist domains, and PKCE

2. **Generate setup artifacts**
   - create starter env blocks
   - generate code snippets
   - generate multi-file starter bundles for `Next.js` and `Express`

3. **Update real projects**
   - write CentralAuth env variables into a target project's `.env` or `.env.local`
   - auto-detect the project type when possible

4. **Optional admin automation**
   - create a new CentralAuth organization from a prompt
   - rotate an existing organization secret
   - immediately produce updated env values for the target app

## Available tools

### Docs-only tools

- `get_integration_checklist`
- `explain_callback_setup`
- `validate_env_requirements`
- `draft_organization_from_prompt`
- `generate_env_template`
- `generate_project_env`
- `write_project_env_file`
- `generate_integration_snippet`
- `generate_starter_files`
- `get_openid_configuration`

### Optional admin-mode tools

These require `CENTRALAUTH_API_KEY` in the MCP server environment:

- `create_organization_from_prompt`
- `rotate_organization_secret`

Both admin tools can also update a target project's `.env` file automatically when you provide a `targetProjectPath` or `targetEnvPath`.

## Example prompts

### Docs-only examples

```text
Use the CentralAuth MCP server to explain how to integrate CentralAuth into my Next.js app.
```

```text
Use the CentralAuth MCP server to generate starter files for an Express app at https://api.example.com.
```

```text
Draft a CentralAuth organization for "Acme Billing Portal" and show me the env variables for a Next.js app at https://billing.example.com.
```

```text
Write the CentralAuth env values for organization "Acme Private Portal" and detect the correct env file automatically.
```

### Admin-mode examples

```text
Create a new CentralAuth organization from the prompt "Acme customer portal" under tenant `YOUR_TENANT_ID` and write the env values into /path/to/my-nextjs-app.
```

```text
Rotate the secret for organization `YOUR_ORG_ID` and update this project's env file.
```

## Example MCP config

### Local workspace build

```json
{
  "mcpServers": {
    "centralauth": {
      "command": "node",
      "args": ["/absolute/path/to/CentralAuth-MCP-Server/dist/index.js"]
    }
  }
}
```

### Installed via `npx`

```json
{
  "mcpServers": {
    "centralauth": {
      "command": "npx",
      "args": ["-y", "centralauth-mcp-server"]
    }
  }
}
```