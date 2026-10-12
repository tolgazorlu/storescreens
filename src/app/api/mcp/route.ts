import { createMcpHandler } from "mcp-handler";
import { AsyncLocalStorage } from "node:async_hooks";
import { registerScreenyTools } from "@/lib/mcp-tools";

// Local single-user tool: no auth. The server only listens on localhost.

/** Request origin, so tool results can return absolute URLs the agent can fetch. */
const originStore = new AsyncLocalStorage<string>();
const origin = () => originStore.getStore() ?? "http://localhost:4110";

export const maxDuration = 300;

const handler = createMcpHandler(
  (server) => registerScreenyTools(server, origin),
  { serverInfo: { name: "screeny", version: "0.1.0" } },
);

const withOrigin = (req: Request) =>
  originStore.run(new URL(req.url).origin, () => handler(req));

export { withOrigin as GET, withOrigin as POST, withOrigin as DELETE };
