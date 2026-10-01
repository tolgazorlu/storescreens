"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/fetcher";

type P = { id: string; name: string; slug: string; updatedAt: string };

export function ProjectsView({ projects }: { projects: P[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const p = await api<P>("/api/projects", { method: "POST", json: { name } });
    setOpen(false);
    router.push(`/p/${p.slug}`);
  }

  async function remove(p: P) {
    if (!confirm(`Delete "${p.name}" and all its screens?`)) return;
    await api(`/api/projects/${p.id}`, { method: "DELETE" });
    toast("Project deleted");
    router.refresh();
  }

  return (
    <main className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Projects</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New project</DialogTitle>
              </DialogHeader>
              <form onSubmit={create} className="space-y-3">
                <Input
                  autoFocus
                  placeholder="App name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full">
                  Create
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects yet. Create one, or let your agent create it through the
            MCP server.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {projects.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-accent/40"
              >
                <Link href={`/p/${p.slug}`} className="flex-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.slug} · {new Date(p.updatedAt).toLocaleString()}
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(p)}
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
