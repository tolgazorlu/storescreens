import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "../args";
import { CliError, print, printJson, usageError } from "../output";
import { loadService } from "../service";

const HELP = "screeny export <project> --apple --out <dir>";

/** Writes the App Store zip to <out>/<slug>-appstore.zip. The out dir resolves against the caller's cwd. */
export async function exportProject(argv: string[]) {
  const { positionals, flags } = parseArgs(
    argv,
    { apple: "boolean", out: "string" },
    HELP,
  );
  const [projectRef, ...extra] = positionals;
  if (!projectRef) throw usageError("missing project", HELP);
  if (extra.length) throw usageError(`unexpected argument ${extra[0]}`, HELP);
  if (!flags.apple) throw usageError("missing --apple (the only export target)", HELP);
  if (typeof flags.out !== "string") throw usageError("missing --out", HELP);
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
  let zip;
  try {
    zip = await service.exportAppleZip(project.id);
  } catch (err) {
    if (err instanceof service.BadRequest) {
      throw new CliError(
        err.message,
        `screeny generate ${project.slug} --spec <file.json> to add screens`,
      );
    }
    throw err;
  }
  const outDir = path.resolve(flags.out);
  const file = path.join(outDir, `${project.slug}-appstore.zip`);
  await mkdir(outDir, { recursive: true });
  await writeFile(file, zip);
  if (flags.json) {
    printJson({ project: project.slug, file, bytes: zip.length });
    return;
  }
  print(
    [
      `exported: ${file}  ${zip.length} bytes`,
      `help: upload the folders in the zip to App Store Connect, see its README.txt`,
    ].join("\n"),
  );
}
