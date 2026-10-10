"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderPlus, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SceneView } from "@/components/scene/scene-view";
import { api } from "@/lib/fetcher";
import { useConfirm } from "@/components/confirm-dialog";
import type { Scene } from "@/lib/scene";

type P = { id: string; name: string; slug: string; updatedAt: string };
export type ProjectSummary = P & {
  screenCount: number;
  locales: string[];
  cover: Scene | null;
};

/** Fixed locale so the server and the browser render the same string. */
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function ProjectsView({ projects }: { projects: ProjectSummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const { confirm, dialog } = useConfirm();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const p = await api<P>("/api/projects", {
        method: "POST",
        json: { name: name.trim() },
      });
      setOpen(false);
      router.push(`/p/${p.slug}`);
    } catch (err) {
      toast.error((err as Error).message);
      setCreating(false);
    }
  }

  async function remove(p: P) {
    const ok = await confirm({
      title: `Delete ${p.name}?`,
      description:
        "Every screen and uploaded asset in this project is removed. This cannot be undone.",
      confirmLabel: "Delete project",
    });
    if (!ok) return;
    await api(`/api/projects/${p.id}`, { method: "DELETE" });
    toast("Project deleted");
    router.refresh();
  }

  const newProject = (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setName("");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            One project per app. Screens, assets and brand live inside it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={create} className="space-y-3">
          <Input
            autoFocus
            placeholder="App name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button
            type="submit"
            className="w-full"
            disabled={creating || !name.trim()}
          >
            {creating ? "Creating" : "Create project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <main className="flex-1 overflow-auto">
      {dialog}
      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {projects.length
                ? `${projects.length} app${projects.length === 1 ? "" : "s"}`
                : "Store screenshots per app, locale and device."}
            </p>
          </div>
          {projects.length > 0 && newProject}
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-card">
              <FolderPlus className="size-5 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-medium">No projects yet</h2>
            <p className="mt-1 mb-5 max-w-sm text-xs text-muted-foreground">
              Create one here, or let your agent create it through the MCP
              server.
            </p>
            {newProject}
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} onDelete={() => remove(p)} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

const COVER_H = 200;

function ProjectCard({
  p,
  onDelete,
}: {
  p: ProjectSummary;
  onDelete: () => void;
}) {
  const sc = p.cover;
  // Fit the cover into the box by height, or by width for wide canvases.
  const k = sc ? Math.min((COVER_H - 32) / sc.height, 188 / sc.width) : 1;
  return (
    <li className="group relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-muted-foreground/50">
      <Link
        href={`/p/${p.slug}`}
        className="block focus-visible:outline-none"
        aria-label={`Open ${p.name}`}
      >
        <div
          className="flex items-center justify-center overflow-hidden bg-muted/50"
          style={{ height: COVER_H }}
        >
          {sc ? (
            <div
              className="overflow-hidden rounded-md shadow-lg ring-1 ring-black/10 transition-transform duration-300 group-hover:scale-[1.03]"
              style={{ width: sc.width * k, height: sc.height * k }}
            >
              <div
                style={{
                  width: sc.width,
                  height: sc.height,
                  transform: `scale(${k})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}
              >
                <SceneView scene={sc} />
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              No screens yet
            </span>
          )}
        </div>
        <div className="border-t border-border px-4 py-3 pr-12">
          <div className="truncate text-sm font-medium">{p.name}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {p.screenCount} screen{p.screenCount === 1 ? "" : "s"}
            {p.locales.length > 0 && ` · ${p.locales.join(", ")}`}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground/70">
            Updated {dateFmt.format(new Date(p.updatedAt))}
          </div>
        </div>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 bottom-3"
            aria-label={`${p.name} actions`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 /> Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
