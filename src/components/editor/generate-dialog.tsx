"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/fetcher";
import { DEVICES, DEVICE_IDS, type DeviceId } from "@/lib/devices";
import {
  TEMPLATE_IDS,
  TEMPLATE_LABELS,
  type TemplateId,
} from "@/lib/templates";
import type { AssetDto, ProjectDto, ScreenDto } from "./types";

type Row = {
  template: TemplateId;
  title: string;
  subtitle: string;
  screenshot: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project: ProjectDto;
  assets: AssetDto[];
  locale: string;
  device: DeviceId;
  onGenerated: (
    rows: ScreenDto[],
    locale: string,
    device: DeviceId,
    replaced: boolean,
  ) => void;
};

export function GenerateDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate screens</DialogTitle>
        </DialogHeader>
        {props.open && <GenerateForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function initialRows(assets: AssetDto[]): Row[] {
  const shots = assets.filter((a) => a.kind === "screenshot");
  return (shots.length ? shots : [null, null, null])
    .slice(0, 10)
    .map((a, i) => ({
      template: i === 0 ? "hero" : i % 2 ? "title-top" : "caption-bottom",
      title: "",
      subtitle: "",
      screenshot: a?.id ?? null,
    }));
}

/** Mounted only while open, so state resets per open without effects. */
function GenerateForm({
  onOpenChange,
  project,
  assets,
  locale: initialLocale,
  device: initialDevice,
  onGenerated,
}: Props) {
  const [locale, setLocale] = useState(initialLocale);
  const [device, setDevice] = useState<DeviceId>(initialDevice);
  const [logo, setLogo] = useState<string>(
    () => assets.find((a) => a.kind === "logo")?.id ?? "__none",
  );
  const [bg, setBg] = useState("#2E3DF2");
  const [textColor, setTextColor] = useState("#ffffff");
  const [replace, setReplace] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => initialRows(assets));
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const out = await api<ScreenDto[]>(
        `/api/projects/${project.id}/screens`,
        {
          method: "POST",
          json: {
            locale,
            device,
            logo: logo === "__none" ? null : logo,
            background: { type: "solid", color: bg },
            textColor,
            replace,
            screens: rows.map((r) => ({
              ...r,
              title: r.title || "Headline",
              subtitle: r.subtitle || undefined,
            })),
          },
        },
      );
      onGenerated(out, locale, device, replace);
      onOpenChange(false);
      toast(`${out.length} screens generated`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shots = assets.filter((a) => a.kind === "screenshot");

  return (
    <>
      <div className="grid grid-cols-4 gap-3 text-sm">
        <Field label="Locale">
          <Input
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="h-8"
          />
        </Field>
        <Field label="Device">
          <Select
            value={device}
            onValueChange={(v) => setDevice(v as DeviceId)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEVICE_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {DEVICES[id].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Logo">
          <Select value={logo} onValueChange={setLogo}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {assets
                .filter((a) => a.kind !== "screenshot")
                .map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Colors">
          <div className="flex gap-1">
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="h-8 w-1/2 cursor-pointer rounded border border-input bg-transparent"
              title="Background"
            />
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-8 w-1/2 cursor-pointer rounded border border-input bg-transparent"
              title="Text"
            />
          </div>
        </Field>
      </div>
      <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[auto_1fr_1fr_auto] items-start gap-2 rounded-md border border-border p-2"
          >
            <span className="w-5 pt-2 text-center text-xs text-muted-foreground">
              {i + 1}
            </span>
            <div className="space-y-1.5">
              <Select
                value={r.template}
                onValueChange={(v) =>
                  setRows(
                    rows.map((x, j) =>
                      j === i ? { ...x, template: v as TemplateId } : x,
                    ),
                  )
                }
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_IDS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TEMPLATE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={r.screenshot ?? "__none"}
                onValueChange={(v) =>
                  setRows(
                    rows.map((x, j) =>
                      j === i
                        ? { ...x, screenshot: v === "__none" ? null : v }
                        : x,
                    ),
                  )
                }
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No screenshot</SelectItem>
                  {shots.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Input
                placeholder="Title"
                value={r.title}
                className="h-8 text-xs"
                onChange={(e) =>
                  setRows(
                    rows.map((x, j) =>
                      j === i ? { ...x, title: e.target.value } : x,
                    ),
                  )
                }
              />
              <Input
                placeholder="Subtitle (optional)"
                value={r.subtitle}
                className="h-8 text-xs"
                onChange={(e) =>
                  setRows(
                    rows.map((x, j) =>
                      j === i ? { ...x, subtitle: e.target.value } : x,
                    ),
                  )
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              aria-label="Remove row"
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={rows.length >= 10}
          onClick={() =>
            setRows([
              ...rows,
              {
                template: "title-top",
                title: "",
                subtitle: "",
                screenshot: null,
              },
            ])
          }
        >
          Add row
        </Button>
      </div>

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
          />{" "}
          Replace existing {locale}/{device} screens
        </label>
        <Button onClick={run} disabled={busy || !rows.length}>
          {busy ? "Generating" : `Generate ${rows.length}`}
        </Button>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
