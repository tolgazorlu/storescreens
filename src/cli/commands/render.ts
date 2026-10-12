import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "../args";
import { CliError, print, printJson, usageError } from "../output";
import { loadService } from "../service";

const HELP =
  "screeny render <project> [--locale <code>] [--device <id>] --out <dir>";

/** Renders a project's screens to PNG files. The out dir resolves against the caller's cwd. */
export async function render(argv: string[]) {
  const { positionals, flags } = parseArgs(
    argv,
    { out: "string", locale: "string", device: "string" },
    HELP,
  );
  const [projectRef, ...extra] = positionals;
  if (!projectRef) throw usageError("missing project", HELP);
  if (extra.length) throw usageError(`unexpected argument ${extra[0]}`, HELP);
  if (typeof flags.out !== "string") throw usageError("missing --out", HELP);
  const filter = {
    locale: typeof flags.locale === "string" ? flags.locale : undefined,
    device: typeof flags.device === "string" ? flags.device : undefined,
  };
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
  const rows = await service.listScreens(project.id, filter);
  if (!rows.length) {
    const parts = [
      filter.locale && `locale ${filter.locale}`,
      filter.device && `device ${filter.device}`,
    ].filter(Boolean);
    throw new CliError(
      parts.length
        ? `no screens in ${project.slug} match ${parts.join(" and ")}`
        : `project ${project.slug} has no screens`,
      parts.length
        ? `screeny render ${project.slug} --out <dir> without filters renders every screen`
        : `screeny generate ${project.slug} --spec <file.json> to add screens`,
    );
  }
  const outDir = path.resolve(flags.out);
  const files = [];
  for (const s of rows) {
    const file = path.join(outDir, service.exportFileName(s));
    const png = await service.renderScreen(s.id);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, png);
    files.push({ id: s.id, locale: s.locale, device: s.device, file, bytes: png.length });
  }
  if (flags.json) {
    printJson({ project: project.slug, out: outDir, rendered: files.length, files });
    return;
  }
  const lines = [`rendered: ${files.length} PNGs from ${project.slug} to ${outDir}`];
  for (const f of files) lines.push(`  ${path.relative(outDir, f.file)}  ${f.bytes} bytes`);
  lines.push(`help: screeny export ${project.slug} --apple --out <dir> for an App Store zip`);
  print(lines.join("\n"));
}
