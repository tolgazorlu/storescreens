"use client";
import useSWR from "swr";
import { useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/fetcher";

type Key = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function SettingsView({
  email,
  origin,
}: {
  email: string;
  origin: string;
}) {
  const { data: keys, mutate } = useSWR<Key[]>("/api/keys", (u: string) =>
    api<Key[]>(u),
  );
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const row = await api<{ key: string }>("/api/keys", {
      method: "POST",
      json: { name },
    });
    setFresh(row.key);
    setName("");
    mutate();
  }

  async function remove(id: string) {
    await api("/api/keys", { method: "DELETE", json: { id } });
    mutate();
  }

  const mcpUrl = `${origin}/api/mcp`;
  const claudeCmd = `claude mcp add --transport http screeny ${mcpUrl} --header "Authorization: Bearer <API_KEY>"`;

  return (
    <main className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-2xl space-y-10">
        <section className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold">API keys</h2>
          <form onSubmit={create} className="flex gap-2">
            <Input
              placeholder="Key name (e.g. claude-code)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Button type="submit">Create</Button>
          </form>
          {fresh && (
            <div className="rounded-md border border-border bg-card p-3 text-sm">
              <p className="mb-2 text-muted-foreground">
                Copy now; it will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all font-mono text-xs">
                  {fresh}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(fresh);
                    toast("Copied");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          )}
          <ul className="divide-y divide-border rounded-md border border-border">
            {(keys ?? []).map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{k.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {k.prefix}…
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {k.lastUsedAt
                      ? `used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : "never used"}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(k.id)}
                    aria-label="Revoke"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
            {keys?.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                No keys yet.
              </li>
            )}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Connect an agent</h2>
          <p className="text-sm text-muted-foreground">
            MCP endpoint (Streamable HTTP, Bearer auth):
          </p>
          <code className="block rounded-md border border-border bg-card p-3 font-mono text-xs">
            {mcpUrl}
          </code>
          <p className="text-sm text-muted-foreground">Claude Code:</p>
          <code className="block whitespace-pre-wrap rounded-md border border-border bg-card p-3 font-mono text-xs">
            {claudeCmd}
          </code>
          <p className="text-sm text-muted-foreground">
            REST: same key as{" "}
            <code className="font-mono">Authorization: Bearer</code> on{" "}
            <code className="font-mono">/api/*</code>.
          </p>
        </section>
      </div>
    </main>
  );
}
