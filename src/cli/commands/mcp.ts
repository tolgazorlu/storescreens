import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { parseArgs } from "../args";
import { loadService } from "../service";

declare const __SCREENY_VERSION__: string;

const HELP = "screeny mcp starts an MCP server over stdio for agent clients";

/** Serves the shared screeny tools over stdio. stdout carries only JSON-RPC. */
export async function mcp(argv: string[]) {
  parseArgs(argv, {}, HELP);
  await loadService();
  const { registerScreenyTools } = await import("@/lib/mcp-tools");
  serveStdio(
    () => {
      const server = new McpServer(
        { name: "screeny", version: __SCREENY_VERSION__ },
        { capabilities: { tools: {} } },
      );
      registerScreenyTools(server, () => "");
      return server;
    },
    { onerror: (err) => console.error(`mcp: ${err.message}`) },
  );
}
