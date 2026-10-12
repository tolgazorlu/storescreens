import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DeviceId } from "@/lib/devices";
import type { TemplateId } from "@/lib/templates";
import { parseArgs } from "../args";
import { CliError, print, printJson, usageError } from "../output";
import { loadService } from "../service";

const HELP = "screeny generate <project> --spec <file.json> [--replace]";

/** Reads and validates a generate spec. Every spec problem is a usage error (exit 2). */
async function readSpec(file: string) {
  let text: string;
  try {
    text = await readFile(path.resolve(file), "utf8");
  } catch {
    throw usageError(`cannot read spec file ${file}`, HELP);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    const reason = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ");
    throw usageError(`spec ${file} is not valid JSON: ${reason}`, HELP);
  }
  const { generateSchema } = await import("@/lib/validation");
  const result = generateSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => {
      const at = i.path.length ? i.path.join(".") : "spec";
      return `${at}: ${i.message}`;
    });
    throw usageError(`invalid spec: ${issues.join("; ")}`, HELP);
  }
  return result.data;
}

/** Runs generateScreens from a JSON spec. The spec path resolves against the caller's cwd. */
export async function generate(argv: string[]) {
  const { positionals, flags } = parseArgs(
    argv,
    { spec: "string", replace: "boolean" },
    HELP,
  );
  const [projectRef, ...extra] = positionals;
  if (!projectRef) throw usageError("missing project", HELP);
  if (extra.length) throw usageError(`unexpected argument ${extra[0]}`, HELP);
  if (typeof flags.spec !== "string") throw usageError("missing --spec", HELP);
  const spec = await readSpec(flags.spec);
  if (flags.replace) spec.replace = true;
  const service = await loadService();
  let project;
  try {
    project = await service.getProject(projectRef);
  } catch (err) {
    if (err instanceof service.NotFound) {
      throw new CliError(
        `project ${projectRef} not found`,
        "screeny projects to list projects, screeny new <name> to create one",
      );
    }
    throw err;
  }
  let created;
  try {
    created = await service.generateScreens(project.id, {
      ...spec,
      device: spec.device as DeviceId,
      screens: spec.screens.map((s) => ({
        ...s,
        template: s.template as TemplateId,
      })),
    });
  } catch (err) {
    if (err instanceof service.NotFound) {
      throw new CliError(
        err.message,
        `screeny add-image ${project.slug} <file> to add an asset, then reference its id`,
      );
    }
    throw err;
  }
  const screens = created.map((s) => ({
    id: s.id,
    locale: s.locale,
    device: s.device,
    position: s.position,
  }));
  if (flags.json) {
    printJson({ project: project.slug, created: screens.length, screens });
    return;
  }
  const lines = [`screens: created ${screens.length} in ${project.slug}`];
  for (const s of screens) {
    lines.push(`  ${s.id}  ${s.locale}  ${s.device}  #${s.position + 1}`);
  }
  lines.push(`help: screeny render ${project.slug} --out <dir> to write PNGs`);
  print(lines.join("\n"));
}
