import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  const mcpUrl = `${origin}/api/mcp`;
  return (
    <main className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <section className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">
            Connect an agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Screeny runs locally with no auth. Point your agent at the MCP
            endpoint while `pnpm dev` is running.
          </p>
        </section>
        <Block title="MCP endpoint (Streamable HTTP)">{mcpUrl}</Block>
        <Block title="Claude Code">{`claude mcp add --transport http screeny ${mcpUrl}`}</Block>
        <Block title="Hermes">{`SCREENY_URL=${origin}  # the screeny skill uses the REST routes under /api`}</Block>
        <Block title="REST">{`GET  ${origin}/api/meta
GET  ${origin}/api/projects
POST ${origin}/api/projects/{slug}/screens
GET  ${origin}/api/projects/{slug}/export?locale=tr&device=iphone-6.9`}</Block>
      </div>
    </main>
  );
}

function Block({ title, children }: { title: string; children: string }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-card p-3 font-mono text-xs">
        {children}
      </pre>
    </section>
  );
}
