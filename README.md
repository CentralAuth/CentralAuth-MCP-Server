# CentralAuth MCP Server

A Model Context Protocol (MCP) server that helps AI tools integrate **CentralAuth** into applications using the public developer documentation and OpenID discovery endpoint.

## Features

- Integration guidance for `Next.js`, `Express`, generic OAuth 2.0 apps, React Native, and desktop apps
- Callback URL, whitelist-domain, and PKCE guidance
- Public OpenID Connect discovery helper
- Starter `.env` templates for app integrations
- Starter framework code snippets
- Full ready-to-copy starter file bundles for `Next.js` and `Express`

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

## Available tools

- `get_integration_checklist`
- `explain_callback_setup`
- `validate_env_requirements`
- `generate_env_template`
- `generate_integration_snippet`
- `generate_starter_files`
- `get_openid_configuration`

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

Once published by the maintainer, users can run the server directly with:

```bash
npx -y centralauth-mcp-server
```