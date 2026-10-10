import { headers } from "next/headers";
import { CopyBlock } from "@/components/copy-block";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  const mcpUrl = `${origin}/api/mcp`;
  return (
    <main className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <section className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Connect an agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Screeny runs locally with no auth. Point your agent at the MCP
            endpoint while{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              pnpm dev
            </code>{" "}
            is running.
          </p>
        </section>
        <CopyBlock title="MCP endpoint (Streamable HTTP)" text={mcpUrl} />
        <CopyBlock
          title="Claude Code"
          text={`claude mcp add --transport http screeny ${mcpUrl}`}
        />
        <CopyBlock
          title="Hermes"
          text={`SCREENY_URL=${origin}  # the screeny skill uses the REST routes under /api`}
        />
        <CopyBlock
          title="REST"
          text={`GET  ${origin}/api/meta
GET  ${origin}/api/projects
POST ${origin}/api/projects/{slug}/screens
GET  ${origin}/api/projects/{slug}/export?locale=tr&device=iphone-6.9`}
        />
      </div>
    </main>
  );
}
