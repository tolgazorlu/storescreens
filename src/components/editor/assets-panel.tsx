"use client";
import { useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConfirm } from "@/components/confirm-dialog";
import { api } from "@/lib/fetcher";
import type { AssetDto, ProjectDto } from "./types";

type Kind = "screenshot" | "logo";

const GROUPS = [
  ["screenshot", "Screenshots"],
  ["logo", "Logos"],
  ["image", "Images"],
] as const;

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
  const kindRef = useRef<Kind>("screenshot");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { confirm, dialog } = useConfirm();

  function pick(kind: Kind) {
    kindRef.current = kind;
    input.current?.click();
  }

  async function upload(files: FileList | null, kind: Kind) {
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
      const noun = kind === "logo" ? "logo" : "screenshot";
      toast.success(
        `${rows.length} ${noun}${rows.length === 1 ? "" : "s"} uploaded`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(a: AssetDto) {
    const ok = await confirm({
      title: `Delete ${a.name}?`,
      description: "Screens that use it will show an empty slot.",
    });
    if (!ok) return;
    await api(`/api/projects/${project.id}/assets/${a.id}`, {
      method: "DELETE",
    });
    onChange(assets.filter((x) => x.id !== a.id));
  }

  return (
    <aside
      className="relative flex w-60 shrink-0 flex-col border-r border-border"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        upload(e.dataTransfer.files, "screenshot");
      }}
    >
      {dialog}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border pr-2 pl-3">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Assets
          {assets.length > 0 && (
            <span className="ml-1.5 font-normal tabular-nums">
              {assets.length}
            </span>
          )}
        </span>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Upload"
                >
                  <Upload className="size-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Upload</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => pick("screenshot")}>
              <ImagePlus /> Screenshots
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => pick("logo")}>
              <ImagePlus /> Logo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={(e) => upload(e.target.files, kindRef.current)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {GROUPS.map(([k, label]) => {
          const rows = assets.filter((a) => a.kind === k);
          if (!rows.length) return null;
          return (
            <section key={k} className="p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{label}</span>
                <span className="tabular-nums">{rows.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {rows.map((a) => (
                  <AssetTile
                    key={a.id}
                    asset={a}
                    onUse={() => onUse(a)}
                    onRemove={() => remove(a)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {assets.length === 0 && (
          <button
            onClick={() => pick("screenshot")}
            className="m-3 flex w-[calc(100%-1.5rem)] flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
          >
            <ImagePlus className="size-5" />
            <span>
              Drop app screenshots here
              <br />
              or click to upload
            </span>
          </button>
        )}
      </div>

      {assets.length > 0 && (
        <p className="shrink-0 border-t border-border px-3 py-2 text-[11px] leading-snug text-muted-foreground">
          Click to place in the selected mockup. Drop files to upload.
        </p>
      )}

      {dragOver && (
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-lg border-2 border-dashed border-foreground/40 bg-background/80 text-xs font-medium backdrop-blur-sm">
          Drop to upload screenshots
        </div>
      )}
    </aside>
  );
}

function AssetTile({
  asset,
  onUse,
  onRemove,
}: {
  asset: AssetDto;
  onUse: () => void;
  onRemove: () => void;
}) {
  // Logos and wide captures keep their own shape; tall screenshots share one.
  const ratio = Math.min(Math.max(asset.width / asset.height, 9 / 19.5), 1.6);
  return (
    <div className="group relative min-w-0">
      <button
        onClick={onUse}
        className="block w-full overflow-hidden rounded-md bg-muted ring-1 ring-border transition hover:ring-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        style={{ aspectRatio: ratio }}
        title={`${asset.name} · ${asset.width}×${asset.height}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.url}
          alt={asset.name}
          loading="lazy"
          className="size-full object-contain"
        />
      </button>
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 rounded-md bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black focus-visible:opacity-100"
        aria-label={`Delete ${asset.name}`}
      >
        <Trash2 className="size-3" />
      </button>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">
        {asset.name}
      </div>
    </div>
  );
}
