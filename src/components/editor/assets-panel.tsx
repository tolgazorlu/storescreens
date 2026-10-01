"use client";
import { useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/fetcher";
import type { AssetDto, ProjectDto } from "./types";

export function AssetsPanel({
  project,
  assets,
  onChange,
  onUse,
}: {
  project: ProjectDto;
  assets: AssetDto[];
  onChange: (a: AssetDto[]) => void;
  onUse: (a: AssetDto) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"screenshot" | "logo">("screenshot");
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("kind", kind);
    for (const f of files) fd.append("files", f);
    try {
      const rows = await api<AssetDto[]>(`/api/projects/${project.id}/assets`, {
        method: "POST",
        body: fd,
      });
      onChange([...rows, ...assets]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(a: AssetDto) {
    await api(`/api/projects/${project.id}/assets/${a.id}`, {
      method: "DELETE",
    });
    onChange(assets.filter((x) => x.id !== a.id));
  }

  const groups = [
    ["screenshot", "Screenshots"],
    ["logo", "Logos"],
    ["image", "Images"],
  ] as const;

  return (
    <aside
      className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-border"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        upload(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Assets
        </span>
        <div className="flex items-center gap-1">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "logo")}
            className="h-7 rounded border border-input bg-transparent px-1 text-xs"
          >
            <option value="screenshot">Screenshot</option>
            <option value="logo">Logo</option>
          </select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                disabled={busy}
                onClick={() => input.current?.click()}
                aria-label="Upload"
              >
                <Upload className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Upload (or drop files here)</TooltipContent>
          </Tooltip>
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(e) => upload(e.target.files)}
          />
        </div>
      </div>
      {groups.map(([k, label]) => {
        const rows = assets.filter((a) => a.kind === k);
        if (!rows.length) return null;
        return (
          <div key={k} className="p-3">
            <div className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {rows.map((a) => (
                <div key={a.id} className="group relative">
                  <button
                    onClick={() => onUse(a)}
                    className="block w-full overflow-hidden rounded border border-border bg-[#222] aspect-[9/16]"
                    title={`${a.name} · ${a.width}×${a.height}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.url}
                      alt={a.name}
                      className="h-full w-full object-contain"
                    />
                  </button>
                  <button
                    onClick={() => remove(a)}
                    className="absolute right-1 top-1 hidden rounded bg-black/70 p-1 text-white group-hover:block"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3" />
                  </button>
                  <div className="mt-1 truncate text-[10px] text-muted-foreground">
                    {a.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {assets.length === 0 && (
        <p className="p-3 text-xs text-muted-foreground">
          Drop app screenshots and a logo here. Click one to place it in the
          selected mockup.
        </p>
      )}
    </aside>
  );
}
