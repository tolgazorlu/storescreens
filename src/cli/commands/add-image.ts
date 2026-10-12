import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "../args";
import { CliError, print, printJson, usageError } from "../output";
import { loadService } from "../service";

const HELP =
  "screeny add-image <project> <file.png> [--kind screenshot|logo|image]";
const KINDS = ["screenshot", "logo", "image"] as const;

/** The service only reads PNG and JPEG dimensions; sniff by magic bytes. */
function contentType(data: Buffer) {
  if (data.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (data[0] === 0xff && data[1] === 0xd8) return "image/jpeg";
  return null;
}

/** Stores a local image as a project asset. Paths resolve against the caller's cwd. */
export async function addImage(argv: string[]) {
  const { positionals, flags } = parseArgs(argv, { kind: "string" }, HELP);
  const [projectRef, file, ...extra] = positionals;
  if (!projectRef) throw usageError("missing project", HELP);
  if (!file) throw usageError("missing image file", HELP);
  if (extra.length) throw usageError(`unexpected argument ${extra[0]}`, HELP);
  const kind = (flags.kind ?? "screenshot") as (typeof KINDS)[number];
  if (!KINDS.includes(kind)) {
    throw usageError(`--kind must be one of ${KINDS.join(", ")}`, HELP);
  }
  const abs = path.resolve(file);
  let data: Buffer;
  try {
    data = await readFile(abs);
  } catch {
    throw new CliError(`cannot read file ${file}`, HELP);
  }
  const type = contentType(data);
  if (!type) throw new CliError(`${file} is not a PNG or JPEG image`, HELP);
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
  const asset = await service.addAsset(project.id, {
    name: path.basename(abs),
    data,
    kind,
    contentType: type,
  });
  if (flags.json) {
    printJson(asset);
    return;
  }
  print(
    [
      `asset: ${asset.id}`,
      `url: ${asset.url}`,
      `kind: ${asset.kind}  size: ${asset.width}x${asset.height}`,
      `help: reference it as "screenshot": "${asset.id}" in a generate spec screen`,
    ].join("\n"),
  );
}
