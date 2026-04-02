# Releasing `centralauth-mcp-server`

This document is for the **maintainer** of this repository.

## Prerequisites

- npm account with publish access
- Node.js 18+
- Clean git working tree recommended

## Release steps

### 1. Verify the package locally

```bash
npm install
npm run release:check
```

This runs:
- `npm run build`
- `npm test`
- `npm pack --dry-run`

### 2. Bump the version

Choose one:

```bash
npm version patch
# or
npm version minor
# or
npm version major
```

### 3. Publish to npm

If you are not logged in yet:

```bash
npm login
```

Then publish:

```bash
npm publish --access public
```

## Verify the published package

After publish, confirm the package can start with `npx`:

```bash
npx -y centralauth-mcp-server
```

It should start and log that the CentralAuth MCP server is running over `stdio`.

## Recommended checks after publishing

- verify the package page on npm
- verify the latest version is available from `npm view centralauth-mcp-server version`
- verify a fresh machine or shell can launch it with `npx -y centralauth-mcp-server`

## VS Code usage after publishing

Users can configure it like this:

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
