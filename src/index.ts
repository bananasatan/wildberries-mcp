#!/usr/bin/env node
/**
 * Wildberries Seller API MCP Server.
 * 15 tools. Production-grade rate limiting with 409 penalty protection.
 *
 * Usage:
 *   WB_API_TOKEN=... wildberries-mcp          # stdio transport
 *   WB_API_TOKEN=... wildberries-mcp --http    # Streamable HTTP transport (port 3000)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WBClient } from "./client.js";
import { toolDefinitions, handleTool, type ToolName } from "./tools.js";

const WB_API_TOKEN = process.env.WB_API_TOKEN;

if (!WB_API_TOKEN) {
  process.stderr.write(
    "ERROR: WB_API_TOKEN environment variable is required.\n" +
      "Get your API token at https://seller.wildberries.ru/supplier-settings/access-to-api\n",
  );
  process.exit(1);
}

const client = new WBClient({ token: WB_API_TOKEN });

const server = new McpServer({
  name: "wildberries-mcp",
  version: "0.3.3",
});

// Register all 15 tools
for (const [name, def] of Object.entries(toolDefinitions)) {
  const toolName = name as ToolName;
  server.tool(
    toolName,
    def.description,
    def.inputSchema.properties as Record<string, unknown>,
    async (args: Record<string, unknown>) => {
      try {
        const result = await handleTool(client, toolName, args);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

// Transport selection
const cliArgs = process.argv.slice(2);
const useHttp = cliArgs.includes("--http");

if (useHttp) {
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );
  const http = await import("node:http");

  const PORT = parseInt(process.env.PORT ?? "3000", 10);

  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (url.pathname === "/mcp" && req.method === "POST") {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } else if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", tools: Object.keys(toolDefinitions).length }));
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  httpServer.listen(PORT, () => {
    process.stderr.write(`[wildberries-mcp] Streamable HTTP server on http://localhost:${PORT}/mcp\n`);
  });
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[wildberries-mcp] Connected via stdio\n");
}
