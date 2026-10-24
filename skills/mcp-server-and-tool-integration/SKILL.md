---
name: mcp-server-and-tool-integration
description: Builds, tests, and deploys Model Context Protocol (MCP) servers and tool connectors. Use when creating custom MCP servers in TypeScript or Python, exposing databases, APIs, or local tools to AI agents, configuring stdio and SSE transports, or integrating official MCP reference servers.
---

# MCP Server and Tool Integration

Build, harden, test, and deploy Model Context Protocol (MCP) servers and connectors based on the official open standard (`modelcontextprotocol/servers` and `anthropics/mcp-builder`).

## Overview

The Model Context Protocol (MCP) provides an open standard for AI models to securely discover and execute tools, read structured resources, and load reusable prompts across disparate hosts (Antigravity, Claude Code, Cursor, Codex, Gemini CLI).

A well-architected MCP server maintains:
1. **Strict Type Safety**: Tool input arguments validated against explicit Zod or JSON schemas.
2. **Deterministic Transports**: Stdio for local process communication, SSE (Server-Sent Events) for remote networked services.
3. **Security Sandboxing**: Path traversal prevention, shell injection defense, and credential isolation.
4. **Interactive Verification**: Verifiable via the official MCP Inspector before client registration.

```
┌────────────────────────────────────────────────────────┐
│ Host Harness (Antigravity / Claude Code / Cursor)      │
└───────────────────────────┬────────────────────────────┘
                            │ Stdio / SSE Transport
                            ▼
┌────────────────────────────────────────────────────────┐
│ MCP Server (TypeScript / Python SDK)                   │
│  ├── Tools: Executable functions with JSON schema      │
│  ├── Resources: File/database/API context providers    │
│  └── Prompts: Templated interaction patterns           │
└────────────────────────────────────────────────────────┘
```

## When to Use

- Exposing databases (PostgreSQL, SQLite, BigQuery), APIs, or local utilities as AI agent tools.
- Building custom connectors when standard CLI commands or static files are insufficient.
- Implementing Server-Sent Events (SSE) remote MCP gateways for centralized organizational tools.
- Hardening MCP server implementations against command injection or directory traversal.
- Debugging tool discovery or schema validation failures using the MCP Inspector.

---

## Implementation Workflows

### 1. Building a TypeScript MCP Server (`@modelcontextprotocol/sdk`)

```bash
npm install @modelcontextprotocol/sdk zod
```

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const server = new Server(
  { name: "custom-data-connector", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// 1. Define Tool Schemas with Zod
const QuerySchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).default(10)
});

// 2. Register Tool Capabilities
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "query_database",
      description: "Safely execute a read-only parameter-bound query against the database.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Read-only SQL statement" },
          limit: { type: "number", description: "Row limit (default 10)" }
        },
        required: ["query"]
      }
    }
  ]
}));

// 3. Handle Tool Invocations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "query_database") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { query, limit } = QuerySchema.parse(request.params.arguments);
  
  // Guard against write operations
  if (/^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)/i.test(query)) {
    throw new Error("Disallowed operation: Only read-only queries are permitted.");
  }

  const rows = await executeDatabaseQuery(query, limit);
  return {
    content: [{ type: "text", text: JSON.stringify(rows, null, 2) }]
  };
});

// 4. Connect Transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

### 2. Building a Python MCP Server (`mcp` SDK)

```bash
pip install mcp
```

```python
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

mcp = FastMCP("CustomPythonConnector")

class FileReadArgs(BaseModel):
    relative_path: str = Field(..., description="Safe path relative to repository root")

@mcp.tool()
def read_secure_file(args: FileReadArgs) -> str:
    """Read file content safely without permitting directory traversal."""
    import os
    base_dir = os.path.abspath("./safe_data")
    target_path = os.path.abspath(os.path.join(base_dir, args.relative_path))
    
    if not target_path.startswith(base_dir):
        raise PermissionError("Directory traversal detected and blocked.")
    
    with open(target_path, "r", encoding="utf-8") as f:
        return f.read()

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

---

### 3. Configuring Host Environments

Configure the server in Antigravity or Claude Code configuration:

```json
{
  "mcpServers": {
    "data-connector": {
      "command": "node",
      "args": ["d:/agent-skills/connectors/data-server.js"],
      "env": {
        "DB_CONNECTION_STRING": "postgres://user:pass@localhost:5432/db"
      }
    }
  }
}
```

---

### 4. Interactive Testing with the MCP Inspector

Never register an untested MCP server into an agent harness. Test tool schemas, parameters, and error responses deterministically:

```bash
# Launch interactive web UI inspector on http://localhost:5173
npx @modelcontextprotocol/inspector node ./dist/server.js
```

---

## Common Rationalizations

| Rationalization | Truth |
| :--- | :--- |
| "Writing custom shell scripts is simpler than MCP." | Scripts force raw text scraping, lack schema reflection, and leak unescaped command tokens. MCP enforces structured schemas and typed outputs. |
| "We don't need input validation because the LLM is smart." | LLMs produce malformed JSON and out-of-range types. Without Zod/Pydantic validation, the server crashes or executes arbitrary data. |
| "Testing with the Inspector is optional if the server boots." | Booting confirms only process launch; testing proves tool listing, parameter binding, and error serialization work under real client contracts. |

---

## Red Flags

- Executing unsanitized user inputs in shell subprocesses (`exec`, `eval`, or unsanitized `child_process.exec`).
- Unrestricted filesystem access without root directory anchoring (`path.resolve` without prefix validation).
- Printing arbitrary debugging logs to `stdout` in Stdio mode (corrupts JSON-RPC 2.0 framing; use `stderr`).
- Missing error handling when external database or API endpoints timeout.

---

## Verification

- [ ] Tool schemas validate against JSON Schema specifications.
- [ ] Stdio servers write debug logs exclusively to `stderr`, leaving `stdout` for JSON-RPC messages.
- [ ] Directory traversal attacks (`../../etc/passwd`) are rejected with clean permission errors.
- [ ] All tools verified interactively via `@modelcontextprotocol/inspector`.
- [ ] Integration verified in target harness (Antigravity, Claude Code, Cursor, or Codex).
